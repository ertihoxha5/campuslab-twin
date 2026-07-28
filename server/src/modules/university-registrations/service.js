import bcrypt from "bcrypt";
import { AppError } from "../../utils/app-error.js";
import { createRegistrationRepository } from "./repository.js";
import { validateRegistrationInput } from "./validation.js";

export function createRegistrationService({
  pool,
  repository = createRegistrationRepository(pool),
  logoStorage,
  passwordRounds = 12,
}) {
  return {
    async register(input, logoFile, context = {}) {
      const registration = validateRegistrationInput(input);
      const { password } = registration;
      const safeRegistration = { ...registration };
      delete safeRegistration.password;
      delete safeRegistration.confirmPassword;
      delete safeRegistration.acceptsTerms;
      const conflict = await repository.findConflict({
        email: registration.representativeEmail,
        acronym: registration.acronym,
        website: registration.officialWebsite,
      });

      if (conflict) {
        throw new AppError({
          status: 409,
          code: "REGISTRATION_CONFLICT",
          message:
            "Një regjistrim me këto të dhëna ekziston tashmë ose është në shqyrtim.",
        });
      }

      const [passwordHash, logoPath] = await Promise.all([
        bcrypt.hash(password, passwordRounds),
        logoStorage.save(logoFile),
      ]);

      try {
        return await repository.create(
          {
            ...safeRegistration,
            passwordHash,
            logoPath,
          },
          context,
        );
      } catch (error) {
        await logoStorage.remove(logoPath);
        throw error;
      }
    },
  };
}
