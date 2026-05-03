import { Module } from "@nestjs/common";
import { PulseAggregatorService } from "./pulse-aggregator.service";
import { EventInteractionGateway } from "./event-interaction.gateway";

@Module({
  providers: [PulseAggregatorService, EventInteractionGateway],
})
export class RealtimeModule {}
