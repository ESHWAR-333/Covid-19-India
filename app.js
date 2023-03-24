const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running on http://localhost:3000/");
    });
  } catch (e) {
    console.log(`db error ${e.message}`);
  }
};

initializeDBAndServer();

const convertSankToCamel = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertSankToCamel2 = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
//API 1

app.get("/states/", async (request, response) => {
  const stateQuery = `select * from state`;
  const dbResponse = await db.all(stateQuery);
  response.send(dbResponse.map((each) => convertSankToCamel(each)));
});

//API 2

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const specificStateQuery = `select * from state where state_id=${stateId}`;
  const dbResponse = await db.get(specificStateQuery);
  response.send(convertSankToCamel(dbResponse));
});

//API 3
app.post("/districts/", async (request, response) => {
  const requestBody = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = requestBody;
  const districtQuery = `insert into district (
    district_name,
    state_id,
    cases,
    cured,
    active,
    deaths )
     values (
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    )`;
  await db.run(districtQuery);
  response.send("District Successfully Added");
});

//API 4
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtQuery = `select * from district where
    district_id=${districtId}`;
  const dbResponse = await db.get(districtQuery);
  response.send(convertSankToCamel2(dbResponse));
  //   response.send(dbResponse);
});

//API 5
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDeleteQuery = `delete from district where
    district_id=${districtId}`;
  await db.run(districtDeleteQuery);
  response.send("District Removed");
});

//API 6

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const requestBody = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = requestBody;
  const districtUpdateQuery = `update district set
    'district_name'='${districtName}',
    state_id='${stateId}',
    cases='${cases}',
    cured='${cured}',
    active='${active}',
    deaths='${deaths}'
    where
    district_id=${districtId};`;
  await db.run(districtUpdateQuery);
  response.send("District Details Updated");
});

//API 7
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateStatsQuery = `
    select 
         sum(cases),
         sum(cured),
         sum(active),
        sum(deaths)
    from 
        district 
    where 
        state_id=${stateId};`;
  const stats = await db.get(stateStatsQuery);
  response.send({
    totalCases: stats["sum(cases)"],
    totalCured: stats["sum(cured)"],
    totalActive: stats["sum(active)"],
    totalDeaths: stats["sum(deaths)"],
  });
  //   response.send(dbResponse);
});

//API 8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
select state_id from district 
where district_id = ${districtId};`;
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery);

  const getStateNameQuery = `
select state_name as stateName from state
where state_id = ${getDistrictIdQueryResponse.state_id};
`;
  const getStateNameQueryResponse = await db.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
});

module.exports = app;
