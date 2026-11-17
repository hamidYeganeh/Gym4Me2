import Application from "./application.json";
import Auth from "./auth.json" with { type: "json" };
import ClubRequests from "./club-requests.json" with { type: "json" };
import Club from "./club.json" with { type: "json" };
import Common from "./common.json" with { type: "json" };
import DashboardGeography from "./dashboard-geography.json" with { type: "json" };
import MobileAuth from "./mobile-auth.json";
import Onboarding from "./onboarding.json" with { type: "json" };
import Resources from "./resources.json" with { type: "json" };
import UserSettings from "./user-settings.json" with { type: "json" };

export default {
  DashboardGeography,
  MobileAuth,
  Application,
  Club,
  ClubRequests,
  Resources,
  Auth,
  Common,
  UserSettings,
  Onboarding,
};
