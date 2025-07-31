import { z } from "zod";
import type { Task, TaskService } from "camunda-external-task-client-js";

export async function work2Handler({ task, taskService }: { task: Task; taskService: TaskService }) {
  console.log(task.variables);

  const rawLocalOrderNumber = task.variables.get("localOrderNumber");
  const parsedLocalOrderNumber = z.number().safeParse(rawLocalOrderNumber);

  if (!parsedLocalOrderNumber.success) {
    return await taskService.handleBpmnError(task, "localOrderNumber must be a number");
  }

  const localOrderNumber = parsedLocalOrderNumber.data;

  task.variables.set("localeVariable", localOrderNumber.toString().split("").reverse().join(""));

  await taskService.complete(task);
} 
