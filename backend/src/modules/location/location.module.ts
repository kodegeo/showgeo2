import { Module, Global } from "@nestjs/common";
import { LocationService } from "./location.service";

@Global()
@Module({
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
