import { describe, expect, it } from "vitest";
import { mapECPayLogisticsStatus } from "./ecpayRoutes";

describe("mapECPayLogisticsStatus", () => {
  it("maps 7-ELEVEN C2C logistics status codes", () => {
    expect(mapECPayLogisticsStatus({ LogisticsSubType: "UNIMARTC2C", RtnCode: "2073" })).toBe("arrived");
    expect(mapECPayLogisticsStatus({ LogisticsSubType: "UNIMARTC2C", RtnCode: "2067" })).toBe("picked_up");
    expect(mapECPayLogisticsStatus({ LogisticsSubType: "UNIMARTC2C", RtnCode: "2074" })).toBe("returned");
  });

  it("maps FamilyMart C2C logistics status codes", () => {
    expect(mapECPayLogisticsStatus({ LogisticsSubType: "FAMIC2C", RtnCode: "3018" })).toBe("arrived");
    expect(mapECPayLogisticsStatus({ LogisticsSubType: "FAMIC2C", RtnCode: "3022" })).toBe("picked_up");
    expect(mapECPayLogisticsStatus({ LogisticsSubType: "FAMIC2C", RtnCode: "3020" })).toBe("returned");
  });

  it("keeps logistics-center updates in transit", () => {
    expect(mapECPayLogisticsStatus({ LogisticsSubType: "FAMIC2C", RtnCode: "3024" })).toBe("in_transit");
    expect(mapECPayLogisticsStatus({ LogisticsSubType: "UNIMARTC2C", RtnCode: "300" })).toBe("in_transit");
  });
});
