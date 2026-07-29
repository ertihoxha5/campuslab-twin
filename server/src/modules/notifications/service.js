import { AppError } from "../../utils/app-error.js";

const notFound = () =>
  new AppError({
    status: 404,
    code: "NOT_FOUND",
    message: "Njoftimi nuk u gjet.",
  });

export function createNotificationService({ repository }) {
  return {
    list(context) {
      return repository.listForUser(context);
    },
    async markRead(id, context) {
      if (!/^[1-9]\d*$/.test(String(id))) throw notFound();
      const changed = await repository.markRead({
        ...context,
        notificationId: id,
      });
      if (!changed) throw notFound();
    },
    markAllRead(context) {
      return repository.markAllRead(context);
    },
  };
}
