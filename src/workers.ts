import { Client, logger } from "camunda-external-task-client-js";
import { env } from "./helpers/envValidation";
import { work1Handler } from "./workers/worker1";
import { work2Handler } from "./workers/worker2";

const config = { baseUrl: env.CAMUNDA_URL, use: logger };

const client = new Client(config);

client.subscribe("work1", work1Handler);
client.subscribe("work2", work2Handler);
