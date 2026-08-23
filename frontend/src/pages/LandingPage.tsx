import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FaAmbulance,
  FaCapsules,
  FaCheckCircle,
  FaChevronDown,
  FaCreditCard,
  FaHeartbeat,
  FaHospital,
  FaMicroscope,
  FaPhoneAlt,
  FaShieldAlt,
  FaUserMd,
  FaWhatsapp,
} from "react-icons/fa";
import {
  FiArrowUp,
  FiArrowRight,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiExternalLink,
  FiMapPin,
  FiMenu,
  FiMoon,
  FiPhoneCall,
  FiSearch,
  FiSun,
  FiX,
} from "react-icons/fi";
import { useEffect, useMemo, useState } from "react";

import hospitalGate from "../assets/optimized/hospital-gate.jpg";
import hospitalExterior from "../assets/optimized/hospital-exterior.jpg";
import ambulancePhoto from "../assets/optimized/ambulance.jpg";
import mdsLogo from "../assets/optimized/logo.png";
import medicalDirector from "../assets/dr2.jpeg";
import consultantPhoto from "../assets/cons.jpeg";
import dentistPhoto from "../assets/optimized/dentist.jpg";
import surgeryPhoto from "../assets/optimized/surgery.jpg";
import laboratoryPhoto from "../assets/optimized/lab.jpg";
import laboratoryRoomPhoto from "../assets/optimized/laboratory-room.jpg";
import nursingPhoto from "../assets/optimized/nursing.jpg";
import pharmacyPhoto from "../assets/optimized/pharmacy.jpg";
import receptionPhoto from "../assets/optimized/reception.jpg";
import nhiaLogo from "../assets/NHIA.png";
import kachimaLogo from "../assets/kschmalogo.png";
import jichimaLogo from "../assets/jichima.png";
import hygeiaLogo from "../assets/hygeia.png";
import { publicServices } from "../data/publicServices";
import { useThemeMode } from "../hooks/useThemeMode";
import { applySeo, seoSiteUrl } from "../utils/seo";

import "../styles/landing.css";

const hospitalAddress =
  "Eastern Bypass, adjacent to Majiya and MYCA7 Filling Station, Giginyu, Kano 700213, Kano";
const whatsappDisplay = "09137526952";
const whatsappUrl =
  "https://wa.me/2349137526952?text=Hello%20MDS%20Hospital%2C%20I%20would%20like%20to%20make%20an%20enquiry.";
const emergencyDisplay = "07082297430";
const emergencyTel = "tel:+2347082297430";
const receptionTel = "tel:+2347062255150";
const googleMapsUrl =
  "https://www.google.com/maps/place/MDS+HOSPITAL/@11.9926965,8.5865612,17z/data=!3m1!4b1!4m6!3m5!1s0x11ae833f2e4d110f:0x916e22c7202b3a5!8m2!3d11.9926965!4d8.5865612!16s%2Fg%2F11hz_lk_v0";
const googleMapsEmbedUrl =
  "https://www.google.com/maps?q=MDS%20Hospital%2C%20Eastern%20Bypass%2C%20Giginyu%2C%20Kano&output=embed";

const schemeItemsRow1 = [
  { name: "NHIA", type: "National Insurance", icon: <FaShieldAlt /> },
  { name: "KSCHIMA", type: "State Scheme", icon: <FaShieldAlt /> },
  { name: "JICHMA", type: "State Scheme", icon: <FaShieldAlt /> },
  { name: "Hygeia HMO", type: "Private HMO", icon: <FaShieldAlt /> },
  { name: "Accredited HMOs", type: "Health Plans", icon: <FaShieldAlt /> },
  { name: "BHCPP 2.0", type: "Basic Health Care", icon: <FaShieldAlt /> },
];

const schemeItemsRow2 = [
  { name: "SEMSAS Hospital Care", type: "Emergency Care", icon: <FaAmbulance /> },
  { name: "SEMSAS Ambulance", type: "Rapid Transport", icon: <FaAmbulance /> },
  { name: "Corporate Retainership", type: "Institutional Care", icon: <FaHospital /> },
  { name: "Hospital Wallet", type: "Direct & Family", icon: <FaCreditCard /> },
  { name: "Clinical Referrals", type: "Hospital Network", icon: <FaCheckCircle /> },
  { name: "Direct Settlement", type: "Flexible Billing", icon: <FaCreditCard /> },
];

const serviceCategories = [
  { id: "all", labelEn: "All Services", labelHa: "Duk Ayyuka", icon: <FaHospital /> },
  { id: "surgery", labelEn: "Surgery & Emergency", labelHa: "Tiyata & Gaggawa", icon: <FaAmbulance /> },
  { id: "diagnostics", labelEn: "Lab & Diagnostics", labelHa: "Lab & Gwaje-gwaje", icon: <FaMicroscope /> },
  { id: "maternity", labelEn: "Maternity & Wards", labelHa: "Haihuwa & Kwanciya", icon: <FaHeartbeat /> },
  { id: "specialists", labelEn: "Specialist Clinics", labelHa: "Kwararrun Likitoci", icon: <FaUserMd /> },
];

function getServiceCategory(slug: string): string {
  if (
    slug === "general-surgery" ||
    slug === "minimal-access-surgery" ||
    slug === "emergency-care"
  ) {
    return "surgery";
  }
  if (
    slug === "diagnostic-laboratory" ||
    slug === "radiology-scanning-ecg" ||
    slug === "pharmacy"
  ) {
    return "diagnostics";
  }
  if (
    slug === "maternity-labour-care" ||
    slug === "inpatient-admission-wards"
  ) {
    return "maternity";
  }
  return "specialists";
}

const directorPhotoTitles = [
  "Consultant General Surgeon",
  "Minimal Access Surgery",
  "Director of Medical Services",
];

const directorCredentials = ["MD", "MSc", "Ph.D.", "FMAS", "M.SAGES", "M.WALS"];

const directorProfileHighlights = [
  {
    value: "30+",
    label: "peer-reviewed publications",
  },
  {
    value: "FMAS",
    label: "minimal access surgery fellowship",
  },
  {
    value: "Public health",
    label: "hospital and programme leadership",
  },
];

const directorFocusAreas = [
  "Laparoscopic surgery",
  "Hospital leadership",
  "Public health systems",
  "Medical education",
];
const trustItems = [
  "Consultant-led clinical services",
  "Accredited healthcare coverage schemes",
  "Secure digital patient coordination",
  "Structured referrals and follow-up",
  "Emergency and ambulance support",
  "English and Hausa patient guidance",
];

const partnerLogos = [
  { src: nhiaLogo, alt: "NHIA" },
  { src: kachimaLogo, alt: "KACHIMA" },
  { src: jichimaLogo, alt: "JICHIMA" },
  { src: hygeiaLogo, alt: "Hygeia HMO" },
];

const showcaseCards = [
  {
    title: "Consultant care",
    description: "Precision-led outpatient evaluation and coordinated treatment planning.",
    image: consultantPhoto,
  },
  {
    title: "Nursing care",
    description: "Attentive ward support from nurses who keep patients comfortable and monitored.",
    image: nursingPhoto,
  },
  {
    title: "Operating theatre",
    description: "Structured surgical workflows with focused theatre teams and safe recovery planning.",
    image: surgeryPhoto,
  },
  {
    title: "Dental and eye care",
    description: "Focused checks and specialist review for clearer clinical direction.",
    image: dentistPhoto,
  },
  {
    title: "Pharmacy",
    description: "Medication dispensing, counselling, and treatment continuity from one care team.",
    image: pharmacyPhoto,
  },
  {
    title: "Laboratory",
    description: "Reliable sample handling and investigations that support timely decisions.",
    image: laboratoryPhoto,
  },
  {
    title: "Laboratory workspace",
    description: "Structured spaces for sample processing and result preparation.",
    image: laboratoryRoomPhoto,
  },
  {
    title: "Reception flow",
    description: "A simple front-desk path for registration, enquiries, and patient direction.",
    image: receptionPhoto,
  },
  {
    title: "Hospital access",
    description: "Real MDS Hospital surroundings for patients, families, and visitors.",
    image: hospitalExterior,
  },
];

type LandingLanguage = "en" | "ha";

const landingCopy: Record<
  LandingLanguage,
  {
    emergencyBar: string;
    emergencyLine: string;
    brandTagline: string;
    nav: {
      about: string;
      services: string;
      ambulance: string;
      leadership: string;
      contact: string;
      portal: string;
    };
    heroKicker: string;
    heroTitle: string;
    heroText: string;
    book: string;
    exploreServices: string;
    heroPillars: Array<{
      title: string;
      text: string;
      href: string;
      icon: "ambulance" | "doctor" | "lab";
    }>;
    discover: string;
    quick: {
      speakSmall: string;
      speakStrong: string;
      ambulanceSmall: string;
      ambulanceStrong: string;
      coverageSmall: string;
      coverageStrong: string;
    };
    aboutEyebrow: string;
    aboutTitle: string;
    aboutP1: string;
    aboutP2: string;
    aboutLink: string;
    servicesEyebrow: string;
    servicesTitle: string;
    servicesText: string;
    serviceCta: string;
    allServices: string;
    emergencyEyebrow: string;
    emergencyTitle: string;
    emergencyText: string;
    callEmergency: string;
    ambulanceEyebrow: string;
    ambulanceTitle: string;
    ambulanceText: string;
    ambulanceActions: {
      call: string;
      whatsapp: string;
      directions: string;
    };
    ambulanceCards: Array<{ title: string; text: string }>;
    schemesEyebrow: string;
    schemesTitle: string;
    schemesText: string;
    showFewer: string;
    showAll: string;
    schemeNote: string;
    showcaseEyebrow: string;
    showcaseTitle: string;
    showcaseText: string;
    contactEyebrow: string;
    contactTitle: string;
    contactText: string;
    contactLabels: {
      call: string;
      emergency: string;
      address: string;
      hours: string;
      hoursValue: string;
      maps: string;
      appointments: string;
      request: string;
      appointmentText: string;
      whatsapp: string;
      phone: string;
      notice: string;
    };
    footerText: string;
    footerHospital: string;
    footerServices: string;
    footerQuick: string;
    footerLinks: {
      about: string;
      leadership: string;
      ambulance: string;
      schemes: string;
      surgery: string;
      clinics: string;
      diagnostics: string;
      pharmacy: string;
      portal: string;
      appointments: string;
      emergency: string;
      directions: string;
    };
    backToTop: string;
    floatingWhatsapp: string;
  }
> = {
  en: {
    emergencyBar: "24/7 Emergency and Ambulance Support",
    emergencyLine: "Emergency line",
    brandTagline: "Patient Care, Reimagined",
    nav: {
      about: "About",
      services: "Services",
      ambulance: "Ambulance",
      leadership: "Leadership",
      contact: "Contact",
      portal: "Staff portal",
    },
    heroKicker: "MDS HOSPITAL",
    heroTitle: "Quality healthcare, closer to you.",
    heroText:
      "Comprehensive medical care, diagnostics, surgery and specialist services delivered by experienced healthcare professionals in Kano.",
    book: "Book an Appointment",
    exploreServices: "Explore Services",
    heroPillars: [
      {
        title: "24/7 Emergency Care",
        text: "Ambulance & rapid clinical support",
        href: "#ambulance",
        icon: "ambulance",
      },
      {
        title: "Specialist Services",
        text: "Consultants, surgery & wards",
        href: "#services",
        icon: "doctor",
      },
      {
        title: "Modern Diagnostics",
        text: "Digital laboratory & accurate scans",
        href: "#services",
        icon: "lab",
      },
    ],
    discover: "Discover MDS Hospital",
    quick: {
      speakSmall: "Speak with our team",
      speakStrong: "Contact reception",
      ambulanceSmall: "Emergency movement",
      ambulanceStrong: "Ambulance support",
      coverageSmall: "Coverage and payment",
      coverageStrong: "View accepted schemes",
    },
    aboutEyebrow: "Welcome to MDS Hospital",
    aboutTitle:
      "A modern care environment grounded in compassion, competence, and trust.",
    aboutP1:
      "Our teams work across outpatient care, specialist consultations, diagnostics, pharmacy, surgical services, admission, preventive healthcare, and aftercare to provide a smoother experience for patients and their families.",
    aboutP2:
      "Patients receive clear direction, practical support, and coordinated care from arrival to follow-up.",
    aboutLink: "Need urgent transfer or ambulance support?",
    servicesEyebrow: "Specialties and services",
    servicesTitle:
      "Healthcare support for every stage of the patient experience.",
    servicesText:
      "Integrated clinical services designed to improve access, diagnosis, treatment, recovery, and follow-up.",
    serviceCta: "View Details & Clinics",
    allServices: "Explore all MDS Hospital services",
    emergencyEyebrow: "Emergency support",
    emergencyTitle: "Need urgent medical assistance?",
    emergencyText:
      "Contact MDS Hospital immediately or visit the hospital for prompt assessment and clinical support.",
    callEmergency: "Call",
    ambulanceEyebrow: "Ambulance and emergency transfer",
    ambulanceTitle: "Fast help when movement matters.",
    ambulanceText:
      "MDS Hospital supports ambulance movement into our facility, transfer from MDS to another hospital, and urgent guidance for patients who need safe movement.",
    ambulanceActions: {
      call: "Call emergency line",
      whatsapp: "Chat on WhatsApp",
      directions: "Get directions",
    },
    ambulanceCards: [
      {
        title: "Bring a patient to MDS",
        text: "Call for guidance when a patient needs urgent movement to our hospital for assessment and care.",
      },
      {
        title: "Transfer to another hospital",
        text: "When a referral is needed, the team can document the movement and support a cleaner handover.",
      },
      {
        title: "Receive ambulance referrals",
        text: "Incoming ambulance arrivals can be recorded clearly for reception, clinical teams, and accounts.",
      },
    ],
    schemesEyebrow: "Coverage and service schemes",
    schemesTitle: "Multiple options for accessible healthcare.",
    schemesText:
      "MDS Hospital works with public, state, private, corporate, and direct-settlement health coverage options.",
    showFewer: "Show fewer schemes",
    showAll: "Show all schemes",
    schemeNote:
      "Coverage acceptance may depend on eligibility, pre-authorisation, procedure type, and plan terms. Some specialist services may require co-payment.",
    showcaseEyebrow: "Care in practice",
    showcaseTitle: "Real environments, visible standard of care.",
    showcaseText:
      "A look inside the people, spaces and working areas supporting patient care across MDS Hospital.",
    contactEyebrow: "Visit or contact MDS Hospital",
    contactTitle: "Let us help you connect to the right care.",
    contactText:
      "Reach our reception for appointments, specialist clinic schedules, scheme confirmations, referrals, ambulance support, and directions to our hospital in Giginyu, Kano.",
    contactLabels: {
      call: "Call MDS Hospital",
      emergency: "Emergency line",
      address: "Hospital address",
      hours: "Working hours",
      hoursValue: "24/7 Emergency & clinical coverage",
      maps: "Open in Google Maps",
      appointments: "Appointments",
      request: "Request a consultation",
      appointmentText:
        "Speak with reception to confirm clinic availability, required documents, and preparation before arrival.",
      whatsapp: "Chat with reception",
      phone: "Call the hospital",
      notice:
        "WhatsApp messages connect directly to reception. For life-threatening situations, use our emergency numbers.",
    },
    footerText:
      "Compassionate, competent healthcare delivery with modern hospital management.",
    footerHospital: "Hospital",
    footerServices: "Services",
    footerQuick: "Quick links",
    footerLinks: {
      about: "About MDS",
      leadership: "Leadership",
      ambulance: "Ambulance care",
      schemes: "Accepted schemes",
      surgery: "Surgery",
      clinics: "Specialist clinics",
      diagnostics: "Diagnostics",
      pharmacy: "Pharmacy",
      portal: "Staff portal",
      appointments: "Appointments",
      emergency: "Emergency line",
      directions: "Hospital directions",
    },
    backToTop: "Back to top",
    floatingWhatsapp: "Message us",
  },
  ha: {
    emergencyBar: "Agajin Gaggawa da Ambulance 24/7",
    emergencyLine: "Layin gaggawa",
    brandTagline: "Kulawar Mara Lafiya Cikin Tsari",
    nav: {
      about: "Game da MDS",
      services: "Ayyuka",
      ambulance: "Ambulance",
      leadership: "Jagoranci",
      contact: "Tuntuba",
      portal: "Shafin ma'aikata",
    },
    heroKicker: "MDS HOSPITAL",
    heroTitle: "Ingantacciyar kulawar lafiya, kusa da kai.",
    heroText:
      "Cikakkiyar kulawar lafiya, gwaje-gwaje, tiyata da ayyukan kwararru karkashin kwararrun ma'aikatan lafiya a Kano.",
    book: "Nemi Ganin Likita",
    exploreServices: "Duba Ayyukanmu",
    heroPillars: [
      {
        title: "Agajin Gaggawa 24/7",
        text: "Ambulance da karbar mara lafiya",
        href: "#ambulance",
        icon: "ambulance",
      },
      {
        title: "Ayyukan Kwararru",
        text: "Likitoci, tiyata da dakunan kwantarwa",
        href: "#services",
        icon: "doctor",
      },
      {
        title: "Gwajin Zamani",
        text: "Binciken dakin gwaji na asibiti",
        href: "#services",
        icon: "lab",
      },
    ],
    discover: "Sanin MDS Hospital",
    quick: {
      speakSmall: "Yi magana da mu",
      speakStrong: "Tuntubi reception",
      ambulanceSmall: "Daukar mara lafiya",
      ambulanceStrong: "Agajin ambulance",
      coverageSmall: "Inshora da biyan kudi",
      coverageStrong: "Duba tsarin da muke karba",
    },
    aboutEyebrow: "Barka da zuwa MDS Hospital",
    aboutTitle:
      "Asibiti na zamani mai kulawa, kwarewa da amana.",
    aboutP1:
      "Muna da ayyukan OPD, kwararrun likitoci, gwaje-gwaje, pharmacy, tiyata, admission, rigakafi da bayanin kulawa bayan an tashi daga asibiti.",
    aboutP2:
      "Mara lafiya na samun jagora mai sauki, kulawa ta mutunci, da tsari daga shigowa har zuwa dawowa dubawa.",
    aboutLink: "Kana bukatar ambulance ko tura mara lafiya?",
    servicesEyebrow: "Ayyukan asibiti",
    servicesTitle:
      "Kulawar lafiya daga matakin farko har zuwa warkewa.",
    servicesText:
      "Ayyukanmu suna taimakawa wajen ganowa, magani, gwaji, karbar magani, admission da bin diddigin lafiyar mara lafiya.",
    serviceCta: "Duba Cikakken Bayani",
    allServices: "Duba duk ayyukan MDS Hospital",
    emergencyEyebrow: "Agajin gaggawa",
    emergencyTitle: "Ana bukatar taimakon gaggawa?",
    emergencyText:
      "A kira MDS Hospital nan da nan ko a zo asibiti domin a duba mara lafiya cikin lokaci.",
    callEmergency: "Kira",
    ambulanceEyebrow: "Motar daukar marasa lafiya",
    ambulanceTitle: "Agaji cikin sauri idan motsa mara lafiya ya zama dole.",
    ambulanceText:
      "MDS Hospital na taimakawa wajen daukar mara lafiya zuwa asibitinmu, ko tura shi wani asibiti idan akwai bukatar kwararre ko kayan aiki na musamman.",
    ambulanceActions: {
      call: "Kira layin gaggawa",
      whatsapp: "Tura sako WhatsApp",
      directions: "Duba hanya",
    },
    ambulanceCards: [
      {
        title: "Dauko mara lafiya zuwa MDS",
        text: "A kira mu idan mara lafiya na bukatar a kawo shi asibiti cikin gaggawa domin duba lafiyarsa.",
      },
      {
        title: "Tura mara lafiya wani asibiti",
        text: "Idan ana bukatar referral, za a rubuta bayanin tura mara lafiya domin mika shi cikin tsari.",
      },
      {
        title: "Karbar wanda aka kawo da ambulance",
        text: "Bayanan wanda ambulance ta kawo za su shiga tsarin reception, likitoci da accounts cikin sauki.",
      },
    ],
    schemesEyebrow: "Inshora da tsarin biyan kudi",
    schemesTitle: "Hanyoyi daban-daban domin samun kulawa.",
    schemesText:
      "MDS Hospital na karbar inshora, tsarin gwamnati, referrals, retainership, wallet da biyan kudi kai tsaye.",
    showFewer: "Rufe wasu",
    showAll: "Nuna duka",
    schemeNote:
      "Karbar inshora na iya dogara da cancanta, amincewa, irin aikin da za a yi, da sharuddan tsarin mara lafiya. Wasu ayyuka na musamman na iya bukatar karin kudi.",
    showcaseEyebrow: "Ainihin yanayin kulawa",
    showcaseTitle: "Sassan asibiti da za ka iya gani a fili.",
    showcaseText:
      "Duba mutane, sassa da wuraren aiki da ke taimakawa kulawar marasa lafiya a MDS Hospital.",
    contactEyebrow: "Ziyarci ko tuntubi MDS Hospital",
    contactTitle: "Mu taimaka maka samun hanyar kulawa mafi dacewa.",
    contactText:
      "Tuntubi reception domin appointment, jadawalin kwararrun likitoci, inshora, referral, ambulance da hanyar zuwa asibitinmu a Giginyu, Kano.",
    contactLabels: {
      call: "Kira MDS Hospital",
      emergency: "Layin gaggawa",
      address: "Adireshin asibiti",
      hours: "Lokacin aiki",
      hoursValue: "Akwai agajin gaggawa 24/7",
      maps: "Bude Google Maps",
      appointments: "Appointment",
      request: "Nemi ganin likita",
      appointmentText:
        "Yi magana da reception domin tabbatar da lokacin clinic da abin da ya kamata a shirya kafin zuwa.",
      whatsapp: "Yi WhatsApp da reception",
      phone: "Kira asibiti",
      notice:
        "WhatsApp zai hada ka da reception. Idan gaggawa ce, a kira layin emergency.",
    },
    footerText:
      "Kwararrun ayyukan lafiya masu tausayi, tare da tsari na zamani domin kula da mara lafiya.",
    footerHospital: "Asibiti",
    footerServices: "Ayyukan lafiya",
    footerQuick: "Hanyoyi masu sauri",
    footerLinks: {
      about: "Game da MDS",
      leadership: "Jagoranci",
      ambulance: "Agajin ambulance",
      schemes: "Inshora da tsare-tsare",
      surgery: "Tiyata",
      clinics: "Clinics na kwararru",
      diagnostics: "Gwaje-gwaje",
      pharmacy: "Pharmacy",
      portal: "Shafin ma'aikata",
      appointments: "Appointment",
      emergency: "Layin gaggawa",
      directions: "Hanyar zuwa asibiti",
    },
    backToTop: "Koma sama",
    floatingWhatsapp: "Turo sako",
  },
};

const socialLinks = [
  { label: "WhatsApp", href: whatsappUrl, icon: <FaWhatsapp />, external: true },
  { label: "Google Maps", href: googleMapsUrl, icon: <FiMapPin />, external: true },
  { label: "Call", href: receptionTel, icon: <FaPhoneAlt /> },
  { label: "Emergency", href: emergencyTel, icon: <FaAmbulance /> },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55 },
  },
};

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [schemesExpanded, setSchemesExpanded] = useState(false);
  const [language, setLanguage] = useState<LandingLanguage>("en");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [serviceSearch, setServiceSearch] = useState<string>("");
  const [showAllServicesMobile, setShowAllServicesMobile] = useState<boolean>(false);
  const { isDark, toggleTheme } = useThemeMode();
  const copy = landingCopy[language];

  const filteredServices = useMemo(() => {
    return publicServices.filter((service) => {
      const matchesCategory =
        selectedCategory === "all" ||
        getServiceCategory(service.slug) === selectedCategory;
      const q = serviceSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        service.title.toLowerCase().includes(q) ||
        service.summary.toLowerCase().includes(q) ||
        service.keywords.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, serviceSearch]);

  const displayedServices = useMemo(() => {
    if (serviceSearch.trim() || selectedCategory !== "all" || showAllServicesMobile) {
      return filteredServices;
    }
    return filteredServices.slice(0, 6);
  }, [filteredServices, selectedCategory, serviceSearch, showAllServicesMobile]);

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === "all") return publicServices.length;
    return publicServices.filter((s) => getServiceCategory(s.slug) === categoryId).length;
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    applySeo({
      title: "MDS Hospital Kano | Emergency Care, Surgery, Diagnostics & Pharmacy",
      description:
        "MDS Hospital in Giginyu, Kano provides 24/7 emergency support, surgery, outpatient care, laboratory, scanning, ECG, pharmacy, maternity, ward admission, immunisation, dental and eye care.",
      canonicalPath: "/",
      keywords:
        "MDS Hospital Kano, hospital in Kano, Giginyu hospital, emergency hospital Kano, surgery Kano, laboratory Kano, pharmacy Kano, maternity hospital Kano",
      imageAlt: "MDS Hospital entrance in Giginyu, Kano",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "MDS Hospital Kano",
        url: seoSiteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${seoSiteUrl}/services?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    });
  }, []);

  const scrollToSection = () => {
    setMenuOpen(false);
  };

  return (
    <div className="landing-page">
      {/* Emergency bar */}
      <div className="emergency-bar">
        <div className="emergency-bar-inner">
          <span>
            <FaAmbulance />
            {copy.emergencyBar}
          </span>

          <a href={emergencyTel}>
            <FiPhoneCall />
            {copy.emergencyLine}: {emergencyDisplay}
          </a>
        </div>
      </div>

      {/* Navigation */}
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          <img src={mdsLogo} alt="MDS Hospital logo" decoding="async" />

          <div>
            <strong>MDS Hospital</strong>
            <span>{copy.brandTagline}</span>
          </div>
        </Link>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label="Open navigation menu"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <FiMenu />
        </button>

        <nav className={`landing-nav ${menuOpen ? "nav-open" : ""}`}>
          <a href="#about" onClick={scrollToSection}>
            {copy.nav.about}
          </a>
          <a href="#services" onClick={scrollToSection}>
            {copy.nav.services}
          </a>
          <a href="#ambulance" onClick={scrollToSection}>
            {copy.nav.ambulance}
          </a>
          <a href="#leadership" onClick={scrollToSection}>
            {copy.nav.leadership}
          </a>
          <a href="#contact" onClick={scrollToSection}>
            {copy.nav.contact}
          </a>

          <button
            type="button"
            className="language-toggle"
            onClick={() =>
              setLanguage((current) => (current === "en" ? "ha" : "en"))
            }
            aria-label={
              language === "en"
                ? "Switch landing page to Hausa"
                : "Switch landing page to English"
            }
          >
            <span className="language-toggle-pulse" />
            <span>{language === "en" ? "Hausa" : "English"}</span>
            <strong>{language === "en" ? "HA" : "EN"}</strong>
          </button>

          <button
            type="button"
            className="landing-theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch home page to light mode" : "Switch home page to dark mode"}
          >
            {isDark ? <FiSun /> : <FiMoon />}
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>
          <Link
            to="/login"
            className="landing-nav-cta"
            onClick={scrollToSection}
          >
            {copy.nav.portal}
            <FiArrowRight />
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-background-glow hero-glow-one" />
          <div className="hero-background-glow hero-glow-two" />

          <div className="hero-grid">
            <motion.div
              className="hero-copy"
              initial="hidden"
              animate="visible"
              variants={reveal}
            >
              <div className="hero-kicker-badge">
                <span className="hero-kicker-dot" />
                <span>{copy.heroKicker}</span>
              </div>

              <h1 className="hero-headline">
                {copy.heroTitle}
              </h1>

              <p className="hero-text">{copy.heroText}</p>

              <div className="hero-actions">
                <a
                  href={whatsappUrl}
                  className="primary-btn hero-primary-btn"
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaWhatsapp />
                  <span>{copy.book}</span>
                </a>

                <a
                  href="#services"
                  className="secondary-btn hero-secondary-btn"
                  onClick={scrollToSection}
                >
                  <span>{copy.exploreServices}</span>
                  <FiArrowRight />
                </a>
              </div>

              {/* 3 Choice Pillars for immediately understandable choices */}
              <div className="hero-choice-pillars">
                {copy.heroPillars.map((pillar) => (
                  <a
                    key={pillar.title}
                    href={pillar.href}
                    onClick={scrollToSection}
                    className="hero-choice-card"
                  >
                    <span className="hero-choice-icon">
                      {pillar.icon === "ambulance" && <FaAmbulance />}
                      {pillar.icon === "doctor" && <FaUserMd />}
                      {pillar.icon === "lab" && <FaMicroscope />}
                    </span>
                    <div className="hero-choice-info">
                      <strong>{pillar.title}</strong>
                      <small>{pillar.text}</small>
                    </div>
                  </a>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="hero-visual"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="hero-cinematic-card">
                <img
                  src={hospitalGate}
                  alt="MDS Hospital facility entrance on Eastern Bypass, Kano"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />

                <div className="hero-cinematic-overlay" />

                {/* Physical trust location badge */}
                <div className="hero-cinematic-badge hero-badge-location">
                  <FiMapPin />
                  <div>
                    <strong>MDS Hospital Facility</strong>
                    <small>Eastern Bypass, Giginyu, Kano</small>
                  </div>
                </div>

                {/* 24/7 Live care active badge */}
                <div className="hero-cinematic-badge hero-badge-live">
                  <span className="live-care-pulse" />
                  <div>
                    <strong>24/7 Clinical Facility</strong>
                    <small>Emergency, Inpatient & Outpatient</small>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <a href="#services" className="scroll-indicator" onClick={scrollToSection}>
            {copy.discover}
            <FaChevronDown />
          </a>
        </section>

        <section className="partners-marquee" aria-label="Partner and accreditation logos">
          <div className="partners-track">
            {[...partnerLogos, ...partnerLogos].map((partner, index) => (
              <div className="partner-pill" key={`${partner.alt}-${index}`}>
                <img src={partner.src} alt={partner.alt} loading="lazy" decoding="async" />
                <span>{partner.alt}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="quick-actions">
          <a href="#contact">
            <span>
              <FiPhoneCall />
            </span>
            <div>
              <small>{copy.quick.speakSmall}</small>
              <strong>{copy.quick.speakStrong}</strong>
            </div>
            <FiArrowRight />
          </a>

          <a href="#ambulance">
            <span>
              <FaAmbulance />
            </span>
            <div>
              <small>{copy.quick.ambulanceSmall}</small>
              <strong>{copy.quick.ambulanceStrong}</strong>
            </div>
            <FiArrowRight />
          </a>

          <a href="#schemes">
            <span>
              <FaShieldAlt />
            </span>
            <div>
              <small>{copy.quick.coverageSmall}</small>
              <strong>{copy.quick.coverageStrong}</strong>
            </div>
            <FiArrowRight />
          </a>
        </section>

        {/* About */}
        <section id="about" className="about-section page-section">
          <motion.div
            className="about-image"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
          >
            <img
              src={hospitalExterior}
              alt="MDS Hospital facility building exterior on Eastern Bypass, Kano"
              loading="lazy"
              decoding="async"
            />

            <div className="about-image-card">
              <FaHospital />
              <div>
                <strong>Integrated hospital care</strong>
                <span>Clinical services coordinated under one system</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="about-content"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
          >
            <p className="eyebrow">{copy.aboutEyebrow}</p>

            <h2>{copy.aboutTitle}</h2>

            <p>{copy.aboutP1}</p>

            <p>{copy.aboutP2}</p>

            <div className="trust-grid">
              {trustItems.map((item) => (
                <div key={item}>
                  <FaCheckCircle />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <a href="#ambulance" className="text-link">
              {copy.aboutLink}
              <FiArrowRight />
            </a>
          </motion.div>
        </section>

        {/* Services */}
        <section id="services" className="services-section page-section">
          <div className="section-heading centered-heading">
            <p className="eyebrow">{copy.servicesEyebrow}</p>
            <h2>{copy.servicesTitle}</h2>
            <p>{copy.servicesText}</p>
          </div>

          {/* Interactive Filter Bar */}
          <div className="services-filter-bar">
            <div className="services-category-tabs" role="tablist" aria-label="Filter hospital services by department">
              {serviceCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === cat.id}
                  className={`service-tab-btn ${selectedCategory === cat.id ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="tab-icon">{cat.icon}</span>
                  <span>{language === "en" ? cat.labelEn : cat.labelHa}</span>
                  <span className="tab-count">{getCategoryCount(cat.id)}</span>
                </button>
              ))}
            </div>

            <div className="services-search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder={
                  language === "en"
                    ? "Search any service, clinic or test (e.g. Surgery, Scan, Dental)..."
                    : "Nemi kowane aiki, duba ko gwaji (misali Tiyata, Scan, Hakori)..."
                }
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                aria-label="Search hospital services"
              />
              {serviceSearch && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setServiceSearch("")}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="services-empty-state">
              <FaHospital />
              <h3>{language === "en" ? "No matching services found" : "Ba a sami aiki mai kama da wannan ba"}</h3>
              <p>
                {language === "en"
                  ? "Try checking your spelling or clearing search filters to see all clinical services."
                  : "Gwada canza rubutun ko share abin da aka rubuta domin ganin dukkan ayyukanmu."}
              </p>
              <button
                type="button"
                className="clear-filters-btn"
                onClick={() => {
                  setSelectedCategory("all");
                  setServiceSearch("");
                }}
              >
                {language === "en" ? "Reset & View All Services" : "Koma ga Dukkan Ayyuka"}
              </button>
            </div>
          ) : (
            <>
              <div className="services-grid">
                {displayedServices.map((service, index) => (
                  <motion.div
                    key={service.slug}
                    className="service-card-wrapper"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{
                      duration: 0.38,
                      delay: Math.min(index * 0.04, 0.22),
                    }}
                    whileHover={{ y: -6 }}
                  >
                    <Link
                      to={`/services/${service.slug}`}
                      className={`service-card ${
                        service.featured ? "service-card-featured" : ""
                      }`}
                      title={`${service.title} - ${copy.serviceCta}`}
                    >
                      <div className="service-card-top">
                        <div className="service-icon">{service.icon}</div>

                        {service.featured ? (
                          <span className="featured-label">
                            {language === "en" ? "Specialist Care" : "Kwararru"}
                          </span>
                        ) : (
                          <span className="service-open-badge">
                            <FiClock />
                            <span>{language === "en" ? "Available 24/7" : "Akwai 24/7"}</span>
                          </span>
                        )}
                      </div>

                      <h3>{service.title}</h3>
                      <p>{service.summary}</p>

                      <div className="service-card-footer">
                        <span className="service-cta-pill">
                          <span>{copy.serviceCta}</span>
                          <FiArrowRight className="pill-arrow" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {filteredServices.length > 6 && !serviceSearch && selectedCategory === "all" && (
                <div className="services-mobile-toggle">
                  <button
                    type="button"
                    className="services-expand-btn"
                    onClick={() => setShowAllServicesMobile((prev) => !prev)}
                  >
                    {showAllServicesMobile ? (
                      <>
                        <span>{language === "en" ? "Show Fewer Services" : "Rufe Wasu Ayyuka"}</span>
                        <FiChevronUp />
                      </>
                    ) : (
                      <>
                        <span>
                          {language === "en"
                            ? `View All ${filteredServices.length} Clinical Services`
                            : `Duba Dukkan Ayyukanmu (${filteredServices.length})`}
                        </span>
                        <FiChevronDown />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="services-index-link">
            <Link to="/services">
              {copy.allServices}
              <FiArrowRight />
            </Link>
          </div>
        </section>

        {/* Emergency banner */}
        <section className="emergency-section">
          <div className="emergency-content">
            <div className="emergency-icon">
              <FaAmbulance />
            </div>

            <div>
              <p className="eyebrow">{copy.emergencyEyebrow}</p>
              <h2>{copy.emergencyTitle}</h2>
              <p>{copy.emergencyText}</p>
            </div>
          </div>

          <div className="emergency-actions">
            <a href={emergencyTel} className="emergency-call-btn">
              <FaPhoneAlt />
              {copy.callEmergency} {emergencyDisplay}
            </a>

            <a
              href={googleMapsUrl}
              className="emergency-location-btn"
              target="_blank"
              rel="noreferrer"
            >
              <FiMapPin />
              {copy.ambulanceActions.directions}
            </a>
          </div>
        </section>

        {/* Ambulance */}
        <section id="ambulance" className="ambulance-section page-section">
          <div className="section-heading">
            <p className="eyebrow">{copy.ambulanceEyebrow}</p>
            <h2>{copy.ambulanceTitle}</h2>
            <p>{copy.ambulanceText}</p>
          </div>

          <div className="ambulance-layout">
            <div className="ambulance-callout">
              <div className="ambulance-callout-info">
                <span className="ambulance-callout-icon">
                  <FaAmbulance />
                </span>
                <div>
                  <small>{copy.emergencyLine} &bull; 24/7 Available</small>
                  <strong>{emergencyDisplay}</strong>
                </div>
              </div>
              <a href={emergencyTel} className="ambulance-callout-btn">
                <FaPhoneAlt />
                <span>{copy.ambulanceActions.call}</span>
              </a>
            </div>

            <div className="ambulance-cards">
              {copy.ambulanceCards.map((card, index) => (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.18 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  whileHover={{ y: -4 }}
                >
                  <span className="step-num">{String(index + 1).padStart(2, "0")}</span>

                  <div className="step-content">
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </div>
                </motion.article>
              ))}
            </div>

            <motion.div
              className="ambulance-panel"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55 }}
            >
              <div className="ambulance-photo-frame">
                <img
                  src={ambulancePhoto}
                  alt="MDS Hospital ambulance for emergency patient transfer in Kano"
                  className="ambulance-photo"
                  loading="lazy"
                  decoding="async"
                />
                <span className="ambulance-badge">SEMSAS Accredited</span>
              </div>

              <div className="ambulance-panel-body">
                <div className="ambulance-panel-header">
                  <FaHospital />
                  <div>
                    <small>EMERGENCY & TRANSFER</small>
                    <strong>{copy.ambulanceTitle}</strong>
                  </div>
                </div>

                <p>{copy.ambulanceText}</p>

                <div className="ambulance-actions">
                  <a href={emergencyTel} className="emergency-call-btn">
                    <FaPhoneAlt />
                    {copy.ambulanceActions.call}
                  </a>

                  <a
                    href={whatsappUrl}
                    className="whatsapp-btn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaWhatsapp />
                    {copy.ambulanceActions.whatsapp}
                  </a>

                  <a
                    href={googleMapsUrl}
                    className="emergency-location-btn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FiMapPin />
                    {copy.ambulanceActions.directions}
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Coverage schemes */}
        <section id="schemes" className="schemes-section">
          <div className="schemes-copy">
            <p className="eyebrow">{copy.schemesEyebrow}</p>
            <h2>{copy.schemesTitle}</h2>
            <p>{copy.schemesText}</p>
          </div>

          <div className="schemes-marquee-container" aria-label="Accepted health schemes and payment options">
            {/* Track 1: Sliding Left */}
            <div className="schemes-track schemes-track-left">
              {[...schemeItemsRow1, ...schemeItemsRow1, ...schemeItemsRow1].map((scheme, idx) => (
                <div key={`row1-${idx}`} className="scheme-pill">
                  <span className="scheme-pill-icon">{scheme.icon}</span>
                  <div className="scheme-pill-info">
                    <span className="scheme-pill-name">{scheme.name}</span>
                    <span className="scheme-pill-type">{scheme.type}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Track 2: Sliding Right */}
            <div className="schemes-track schemes-track-right">
              {[...schemeItemsRow2, ...schemeItemsRow2, ...schemeItemsRow2].map((scheme, idx) => (
                <div key={`row2-${idx}`} className="scheme-pill">
                  <span className="scheme-pill-icon">{scheme.icon}</span>
                  <div className="scheme-pill-info">
                    <span className="scheme-pill-name">{scheme.name}</span>
                    <span className="scheme-pill-type">{scheme.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="scheme-note">
            <FaCheckCircle />
            <p>{copy.schemeNote}</p>
          </div>
        </section>

        <section className="showcase-section page-section">
          <div className="section-heading centered-heading">
            <p className="eyebrow">{copy.showcaseEyebrow}</p>
            <h2>{copy.showcaseTitle}</h2>
            <p>{copy.showcaseText}</p>
          </div>

          <div className="showcase-grid">
            {showcaseCards.map((card, index) => (
              <motion.article
                key={card.title}
                className="showcase-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                whileHover={{ y: -8, scale: 1.01 }}
              >
                <img src={card.image} alt={card.title} loading="lazy" decoding="async" />
                <div className="showcase-card-body">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Leadership */}
        <section id="leadership" className="leadership-section page-section">
          <motion.div
            className="director-photo-wrapper"
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
          >
            <div className="director-photo">
              <img
                src={medicalDirector}
                alt="Director Abdulkadir Yakubu, Chief Executive Officer of MDS Hospital"
                loading="lazy"
                decoding="async"
              />

              <div className="director-photo-overlay">
                <small>Clinical leadership</small>
                <strong>Dr. Abdulkadir Yakubu</strong>
                <div className="director-photo-title-stack">
                  {directorPhotoTitles.map((title) => (
                    <span key={title}>{title}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="director-accent-card">
              <FaUserMd />
              <div>
                <strong>Consultant General Surgeon</strong>
                <span>Minimal Access Surgery and Health Leadership</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="director-content"
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
          >
            <p className="eyebrow">Clinical leadership</p>

            <h2>Surgeon-led care with disciplined hospital leadership.</h2>

            <div className="director-heading-row">
              <div>
                <h3>Dr. Abdulkadir Yakubu, Ph.D.</h3>
                <p>
                  Consultant General Surgeon and Specialist in Minimal Access
                  (Laparoscopic) Surgery.
                </p>
              </div>
              <strong>30+ publications</strong>
            </div>

            <div className="director-titles">
              {directorCredentials.map((credential) => (
                <span key={credential}>{credential}</span>
              ))}
            </div>

            <p className="director-introduction">
              Dr. Yakubu brings together advanced surgical practice, hospital
              administration, public-health leadership, and medical education.
              His work reflects a clear commitment to safer clinical systems,
              stronger healthcare teams, and accessible specialist care.
            </p>

            <div className="director-highlight-grid director-compact-highlights">
              {directorProfileHighlights.map((item) => (
                <article key={item.value}>
                  <strong>{item.value}</strong>
                  <p>{item.label}</p>
                </article>
              ))}
            </div>

            <div className="director-focus-strip">
              {directorFocusAreas.map((area) => (
                <span key={area}>{area}</span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Digital care */}
        <section className="digital-care-section">
          <div className="digital-care-content">
            <p className="eyebrow">Smart hospital coordination</p>
            <h2>Technology supporting safer, faster, and more connected care.</h2>

            <p>
              MDS Hospital uses structured digital workflows to support patient
              registration, clinical documentation, billing, pharmacy,
              diagnostics, admissions, referrals, and follow-up.
            </p>

            <div className="digital-features">
              <div>
                <FaShieldAlt />
                Secure patient records
              </div>

              <div>
                <FaHeartbeat />
                Coordinated clinical workflows
              </div>

              <div>
                <FaMicroscope />
                Connected diagnostics
              </div>

              <div>
                <FaCapsules />
                Integrated pharmacy support
              </div>
            </div>
          </div>

          <div className="digital-visual">
            <div className="dashboard-card dashboard-main-card">
              <div className="dashboard-card-header">
                <span className="dashboard-logo">
                  <img src={mdsLogo} alt="" loading="lazy" decoding="async" />
                </span>

                <div>
                  <strong>MDS Care Coordination</strong>
                  <small>Secure hospital workflow</small>
                </div>
              </div>

              <div className="dashboard-progress">
                <span>Care coordination status</span>
                <strong>Coordinated</strong>
              </div>

              <div className="progress-track">
                <span />
              </div>

              <div className="dashboard-list">
                <div>
                  <FaCheckCircle />
                  Registration completed
                </div>
                <div>
                  <FaCheckCircle />
                  Consultation assigned
                </div>
                <div>
                  <FaCheckCircle />
                  Clinical services coordinated
                </div>
              </div>
            </div>

            <div className="dashboard-card dashboard-small-card">
              <FaShieldAlt />
              <div>
                <strong>Protected access</strong>
                <small>Role-based staff portal</small>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="contact-section">
          <div className="contact-copy">
            <p className="eyebrow">{copy.contactEyebrow}</p>

            <h2>{copy.contactTitle}</h2>

            <p>{copy.contactText}</p>

            <div className="contact-details">
              <a href={receptionTel}>
                <span>
                  <FiPhoneCall />
                </span>

                <div>
                  <small>{copy.contactLabels.call}</small>
                  <strong>{whatsappDisplay}</strong>
                </div>
              </a>

              <a href={emergencyTel}>
                <span>
                  <FaAmbulance />
                </span>

                <div>
                  <small>{copy.contactLabels.emergency}</small>
                  <strong>{emergencyDisplay}</strong>
                </div>
              </a>

              <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                <span>
                  <FiMapPin />
                </span>

                <div>
                  <small>{copy.contactLabels.address}</small>
                  <strong>{hospitalAddress}</strong>
                </div>
              </a>

              <div>
                <span>
                  <FiClock />
                </span>

                <div>
                  <small>{copy.contactLabels.hours}</small>
                  <strong>{copy.contactLabels.hoursValue}</strong>
                </div>
              </div>
            </div>

            <div className="contact-map-card">
              <iframe
                title="MDS Hospital location map"
                src={googleMapsEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                {copy.contactLabels.maps}
                <FiExternalLink />
              </a>
            </div>
          </div>

          <div className="appointment-card">
            <div className="appointment-icon">
              <FaUserMd />
            </div>

            <p className="eyebrow">{copy.contactLabels.appointments}</p>
            <h3>{copy.contactLabels.request}</h3>

            <p>{copy.contactLabels.appointmentText}</p>

            <a
              href={whatsappUrl}
              className="whatsapp-btn"
              target="_blank"
              rel="noreferrer"
            >
              <FaWhatsapp />
              {copy.contactLabels.whatsapp}
            </a>

            <a href={receptionTel} className="call-btn">
              <FaPhoneAlt />
              {copy.contactLabels.phone}
            </a>

            <small className="appointment-notice">
              {copy.contactLabels.notice}
            </small>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/">
              <img src={mdsLogo} alt="MDS Hospital" loading="lazy" decoding="async" />

              <div>
                <strong>MDS Hospital</strong>
                <span>{copy.brandTagline}</span>
              </div>
            </Link>

            <p>{copy.footerText}</p>

            <div className="social-links">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-label={link.label}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="footer-column">
            <h4>{copy.footerHospital}</h4>
            <a href="#about">{copy.footerLinks.about}</a>
            <a href="#leadership">{copy.footerLinks.leadership}</a>
            <a href="#ambulance">{copy.footerLinks.ambulance}</a>
            <a href="#schemes">{copy.footerLinks.schemes}</a>
          </div>

          <div className="footer-column">
            <h4>{copy.footerServices}</h4>
            <a href="#services">{copy.footerLinks.surgery}</a>
            <a href="#services">{copy.footerLinks.clinics}</a>
            <a href="#services">{copy.footerLinks.diagnostics}</a>
            <a href="#services">{copy.footerLinks.pharmacy}</a>
          </div>

          <div className="footer-column">
            <h4>{copy.footerQuick}</h4>
            <Link to="/login">{copy.footerLinks.portal}</Link>
            <a href="#contact">{copy.footerLinks.appointments}</a>
            <a href={emergencyTel}>{copy.footerLinks.emergency}</a>
            <a href={googleMapsUrl} target="_blank" rel="noreferrer">
              {copy.footerLinks.directions}
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            &copy; {new Date().getFullYear()} MDS Hospital. All rights reserved.
          </span>

          <span>NHIS / KACHMA / JICHMA Accredited</span>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={whatsappUrl}
        className="floating-whatsapp"
        target="_blank"
        rel="noreferrer"
        aria-label="Contact MDS Hospital on WhatsApp"
      >
        <FaWhatsapp />
        <span>{copy.floatingWhatsapp}</span>
      </a>

      <button
        type="button"
        className={`back-to-top ${showBackToTop ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={copy.backToTop}
      >
        <FiArrowUp />
      </button>
    </div>
  );
}


