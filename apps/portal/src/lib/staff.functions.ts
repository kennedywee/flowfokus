/** Development runs entirely on frontend sample data. Production retains the API boundary. */
import * as live from "./staff.live.functions";
import * as mock from "./staff.mock";
export type { MemberRecord } from "./staff.live.functions";

export const getAccess = import.meta.env.DEV ? mock.getAccess : live.getAccess;
export const getStaffOrganization = import.meta.env.DEV ? mock.getStaffOrganization : live.getStaffOrganization;
export const getOverview = import.meta.env.DEV ? mock.getOverview : live.getOverview;
export const listMembers = import.meta.env.DEV ? mock.listMembers : live.listMembers;
export const createMember = import.meta.env.DEV ? mock.createMember : live.createMember;
export const getMemberRecord = import.meta.env.DEV ? mock.getMemberRecord : live.getMemberRecord;
export const listProducts = import.meta.env.DEV ? mock.listProducts : live.listProducts;
export const listSales = import.meta.env.DEV ? mock.listSales : live.listSales;
export const getSale = import.meta.env.DEV ? mock.getSale : live.getSale;
export const createSale = import.meta.env.DEV ? mock.createSale : live.createSale;
export const recordPayment = import.meta.env.DEV ? mock.recordPayment : live.recordPayment;
export const fulfillSale = import.meta.env.DEV ? mock.fulfillSale : live.fulfillSale;
export const listCheckIns = import.meta.env.DEV ? mock.listCheckIns : live.listCheckIns;
export const createCheckIn = import.meta.env.DEV ? mock.createCheckIn : live.createCheckIn;
