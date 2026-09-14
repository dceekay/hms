/**
 * Official MDS Hospital Information & Master Contact Constants
 * Single source of truth for all public pages, printable documents, ID cards, and receipts.
 */

export const HOSPITAL_OFFICIAL_DETAILS = {
  name: "MDS SPECIALIST HOSPITAL",
  legalName: "MDS Specialist Hospital Limited",
  brandSubtitle: "Specialist Diagnostic Centre & Clinical Pathology",
  shortSubtitle: "Specialist Medical & Diagnostic Centre",

  // Physical Location
  streetAddress: "Eastern Bypass, adjacent to Majiya and MYCA7 Filling Station, Giginyu",
  city: "Kano",
  state: "Kano State",
  postalCode: "700213",
  country: "Nigeria",
  fullAddress: "Eastern Bypass, adjacent to Majiya and MYCA7 Filling Station, Giginyu, Kano 700213, Kano State, Nigeria",
  shortAddress: "Eastern Bypass, Giginyu, Kano, Nigeria",
  district: "Giginyu, Kano",

  // Geo Coordinates
  latitude: 11.9927,
  longitude: 8.5866,

  // Contact Channels
  primaryPhone: "+234 913 752 6952",
  emergencyPhone: "+234 913 752 6952",
  tollFreeHelpline: "+234 812 345 6789",
  displayPhone: "+234 913 752 6952 / +234 812 345 6789",
  whatsappNumber: "+2349137526952",
  whatsappUrl: "https://wa.me/2349137526952?text=Hello%20MDS%20Hospital%2C%20I%20would%20like%20to%20make%20an%20enquiry.",
  email: "info@mdshospital.com",
  web: "mds01.vercel.app",
  websiteUrl: "https://mds01.vercel.app",

  // Regulatory & Licensing
  accreditation: "Kano State Ministry of Health Licensed • 24/7 Tertiary Referral & Emergency",
  laboratoryAccreditation: "Accredited Clinical Pathology & Diagnostic Services",
  pharmacyLicensing: "Licensed Pharmaceutical Dispensary • PCN Compliant",

  // Maps & Location
  googleMapsUrl: "https://www.google.com/maps/place/MDS+HOSPITAL/@11.9926965,8.5865612,17z",
} as const;

export default HOSPITAL_OFFICIAL_DETAILS;
