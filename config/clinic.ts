export interface ClinicConfig {
  id: string;
  name: string;
  legalName: string;
  tagline: string;
  branding: {
    primaryColor: string;
    primaryHover: string;
    accentEmerald: string;
    logoUrl: string;
    emailLogoUrl: string;
    faviconUrl: string;
    svasthLogoUrl: string;
    poweredBySvasth: boolean;
  };
}

export const clinicConfig: ClinicConfig = {
  id: "shahi-dental-clinic",
  name: "Shahi Dental Clinic",
  legalName: "Shahi Dental Clinic",
  tagline: "Multi-Speciality Dental Clinic",
  branding: {
    primaryColor: "#176e56",
    primaryHover: "#155944",
    accentEmerald: "#369568",
    logoUrl: "/dental_logo.webp",
    emailLogoUrl: "/svaasth_logo_email.png",
    faviconUrl: "/Svaasth_favicon.png",
    svasthLogoUrl: "/Svaasth_logo.png",
    poweredBySvasth: true,
  },
};
