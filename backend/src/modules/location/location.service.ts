import { Injectable } from "@nestjs/common";
import * as geoip from "geoip-lite";

export interface ResolvedLocation {
  country: string;
  region: string;
  city: string;
}

@Injectable()
export class LocationService {
  /**
   * Resolve IP to approximate location (country, region/state, city).
   * Uses geoip-lite. Returns null if IP is invalid or cannot be resolved.
   */
  getLocationFromIp(ip: string | undefined | null): ResolvedLocation | null {
    if (!ip || typeof ip !== "string") return null;
    const trimmed = ip.trim();
    if (!trimmed) return null;
    // Handle x-forwarded-for style: "client, proxy1, proxy2"
    const clientIp = trimmed.split(",")[0]?.trim() ?? trimmed;
    const lookup = geoip.lookup(clientIp);
    if (!lookup) return null;
    return {
      country: lookup.country ?? "",
      region: lookup.region ?? "",
      city: lookup.city ?? "",
    };
  }
}
