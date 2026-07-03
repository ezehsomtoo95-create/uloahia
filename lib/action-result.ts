export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export function actionSuccess<T>(data?: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError<T = void>(error: string): ActionResult<T> {
  return { success: false, error };
}

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return actionSuccess(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong. Please try again.";

    return actionError<T>(message);
  }
}
