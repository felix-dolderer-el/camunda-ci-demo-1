import { Variables, type Task, type TaskService, type TypedValue } from "camunda-external-task-client-js";
import { z } from "zod";

export async function work1Handler({ task, taskService }: { task: Task; taskService: TaskService }) {
  const rawOrderNumber = task.variables.get("orderNumber");
  const parsedOrderNumber = z.number().safeParse(rawOrderNumber);

  if (!parsedOrderNumber.success) {
    console.log("orderNumber must be a number");
    return await taskService.handleBpmnError(task, "orderNumber must be a number");
  }

  const orderNumber = parsedOrderNumber.data;
  const localVariables = new Variables();
  try {
    localVariables.set("isOkay", orderNumber > 1_000 && orderNumber < 9_999);
  } catch (error) {
    console.log("error setting isOkay");
    return;
  }

  try {
    console.log("completing task");
    await taskService.complete(task, localVariables);
    console.log("task completed");
  } catch (error) {
    console.log("error completing task");
  }
}
