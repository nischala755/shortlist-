type LogError = {
  name: string;
  message: string;
};

function serializeError(error: unknown): LogError {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { name: "UnknownError", message: "An unknown error occurred" };
}

export const logger = {
  error(context: string, error: unknown) {
    console.error(
      JSON.stringify({
        level: "error",
        context,
        error: serializeError(error),
      }),
    );
  },
};
