import { parse } from "cookie";
import { Server } from "socket.io";
import { requiresLaboratoryAssignment } from "../middleware/require-laboratory-access.js";
import { resolveTenantAuthentication } from "../middleware/authenticate-tenant.js";
import { ACCESS_COOKIE } from "../modules/auth/tokens.js";

export const universityRoom = (universityId) => `university:${universityId}`;
export const laboratoryRoom = (universityId, laboratoryId) =>
  `${universityRoom(universityId)}:laboratory:${laboratoryId}`;
export const userRoom = (universityId, userId) =>
  `${universityRoom(universityId)}:user:${userId}`;

const realtimeError = (code, message) => ({
  success: false,
  error: { code, message },
});

export function createRealtimeServer(
  httpServer,
  { clientOrigin, authRepository, accessSecret, laboratoryAccessRepository },
) {
  const io = new Server(httpServer, {
    cors: {
      origin: clientOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parse(socket.handshake.headers.cookie ?? "");
      socket.data.auth = await resolveTenantAuthentication({
        token: cookies[ACCESS_COOKIE],
        authRepository,
        accessSecret,
      });
      next();
    } catch {
      const error = new Error("Sesioni realtime nuk është i vlefshëm.");
      error.data = { code: "UNAUTHENTICATED" };
      next(error);
    }
  });

  io.on("connection", async (socket) => {
    const auth = socket.data.auth;
    await socket.join(universityRoom(auth.universityId));
    await socket.join(userRoom(auth.universityId, auth.userId));

    socket.on(
      "laboratory:join",
      async (payload = {}, acknowledge = () => {}) => {
        try {
          const laboratoryId = String(payload.laboratoryId ?? "").trim();
          if (!laboratoryId) {
            acknowledge(
              realtimeError("NOT_FOUND", "Laboratori i kërkuar nuk u gjet."),
            );
            return;
          }

          const laboratory =
            await laboratoryAccessRepository.findAccessibleLaboratory({
              universityId: auth.universityId,
              userId: auth.userId,
              laboratoryId,
              requiresAssignment: requiresLaboratoryAssignment(auth),
            });

          if (!laboratory) {
            acknowledge(
              realtimeError("NOT_FOUND", "Laboratori i kërkuar nuk u gjet."),
            );
            return;
          }

          const room = laboratoryRoom(auth.universityId, laboratory.id);
          await socket.join(room);
          acknowledge({
            success: true,
            data: { laboratoryId: String(laboratory.id), room },
          });
        } catch {
          acknowledge(
            realtimeError(
              "REALTIME_ERROR",
              "Lidhja me laboratorin nuk mund të përfundohej.",
            ),
          );
        }
      },
    );

    socket.on(
      "laboratory:leave",
      async (payload = {}, acknowledge = () => {}) => {
        const laboratoryId = String(payload.laboratoryId ?? "").trim();
        if (laboratoryId) {
          await socket.leave(laboratoryRoom(auth.universityId, laboratoryId));
        }
        acknowledge({ success: true });
      },
    );
  });

  return io;
}
