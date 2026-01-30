import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

@Injectable()
export class BcryptService {
    constructor(private readonly config: ConfigService) { }

    async bcryptHash(value: string, forWhat: "password" | "otp") {
        const saltRounds = forWhat == "password" ? this.config.get<number>("env.hashing.passwordRounds") : this.config.get<number>("env.hashing.otpRounds");
        return bcrypt.hashSync(value, saltRounds);
    }

    async bcryptCompare(value: string, hashedValue: string, forWhat: "password" | "otp") {
        const saltRounds = forWhat == "password" ? this.config.get<number>("env.hashing.passwordRounds") : this.config.get<number>("env.hashing.otpRounds");
        return bcrypt.compareSync(value, hashedValue);
    }

    async bcryptVerify(value: string, hashedValue: string, forWhat: "password" | "otp") {
        const saltRounds = forWhat == "password" ? this.config.get<number>("env.hashing.passwordRounds") : this.config.get<number>("env.hashing.otpRounds");
        return bcrypt.verify(value, hashedValue, saltRounds);
    }
}