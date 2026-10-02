export function validateCommand(value) {
  if (!value || !["add", "remove"].includes(value.action) ||
      !["shopping", "todo"].includes(value.list) ||
      typeof value.item !== "string" || !value.item.trim() || value.item.length > 200) {
    throw new Error("Could not understand a valid command. Please try again.");
  }
  return { type: value.action, item: value.item.trim(), list: value.list };
}

export function nextCommand(current, command) {
  const previous = current?.runningCount ?? 0;
  if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) {
    throw new Error("Invalid command counter in Firebase.");
  }
  return { ...command, runningCount: previous + 1 };
}

export function waitForStatus(ref, runningCount, { timeoutMs = 60000, signal } = {}) {
  return new Promise((resolve, reject) => {
    let timer;
    const finish = (error, value) => {
      clearTimeout(timer);
      ref.off("value", onValue);
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve(value);
    };
    const onValue = (snapshot) => {
      const value = snapshot.val();
      if (value?.runningCount === runningCount && typeof value.success === "boolean") {
        finish(null, { runningCount, success: value.success,
          text: typeof value.text === "string" ? value.text : "Display responded." });
      }
    };
    const onAbort = () => finish(new Error("Request cancelled."));
    if (signal?.aborted) return onAbort();
    timer = setTimeout(() => finish(null, null), timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    ref.on("value", onValue, (error) => finish(error));
  });
}
