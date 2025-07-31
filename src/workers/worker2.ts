import { z } from "zod";
import { Variables, type Task, type TaskService } from "camunda-external-task-client-js";

export async function work2Handler({ task, taskService }: { task: Task; taskService: TaskService }) {
  const rawOrderNumber = task.variables.get("orderNumber");
  const parsedOrderNumber = z.number().safeParse(rawOrderNumber);

  if (!parsedOrderNumber.success) {
    return await taskService.handleBpmnError(task, "orderNumber must be a number");
  }

  const orderNumber = parsedOrderNumber.data;

  const localVariables = new Variables();
  localVariables.set("localeVariable", orderNumber.toString().split("").reverse().join(""));

  await taskService.complete(task, localVariables);
}
