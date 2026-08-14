import type { ReactNode } from "react";
import {
  FaAmbulance,
  FaBed,
  FaCapsules,
  FaClinicMedical,
  FaEye,
  FaFirstAid,
  FaHeartbeat,
  FaHospital,
  FaMicroscope,
  FaShieldAlt,
  FaStethoscope,
  FaSyringe,
  FaTooth,
  FaUserMd,
  FaUsers,
} from "react-icons/fa";

import hospitalExterior from "../assets/outdoorwithcars.png";
import consultantPhoto from "../assets/cons.jpeg";
import dentistPhoto from "../assets/dentist.png";
import surgeryPhoto from "../assets/surrr.jpg";
import laboratoryPhoto from "../assets/lab.png";
import laboratoryRoomPhoto from "../assets/labrotory.png";
import nursingPhoto from "../assets/nurse2.png";
import pharmacyPhoto from "../assets/pharm.png";

export type PublicService = {
  slug: string;
  title: string;
  shortTitle: string;
  seoTitle: string;
  summary: string;
  description: string;
  keywords: string;
  icon: ReactNode;
  image: string;
  imageAlt: string;
  featured?: boolean;
  offerings: string[];
  benefits: string[];
  journey: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  relatedSlugs: string[];
};

const commonFaqs = {
  appointment: {
    question: "Do I need an appointment?",
    answer:
      "Appointments help reduce waiting time, but urgent cases can come directly to MDS Hospital for assessment.",
  },
  location: {
    question: "Where is MDS Hospital located?",
    answer:
      "MDS Hospital is on Eastern Bypass, beside Majiya and MYCA7 Filling Station, Giginyu, Kano.",
  },
  coverage: {
    question: "Can I use insurance or an HMO?",
    answer:
      "MDS Hospital supports accepted coverage schemes. Please confirm your insurance details at reception before service.",
  },
};

export const publicServices: PublicService[] = [
  {
    slug: "general-surgery",
    title: "General Surgery",
    shortTitle: "General Surgery",
    seoTitle: "General Surgery in Kano | MDS Hospital",
    summary:
      "Consultant-led surgical assessment and treatment planning for patients who need safe, coordinated care.",
    description:
      "MDS Hospital provides general surgery services in Giginyu, Kano, including consultation, pre-operative review, theatre coordination, and follow-up care.",
    keywords:
      "general surgery Kano, surgical hospital Kano, surgery consultation Kano, MDS Hospital surgery",
    icon: <FaUserMd />,
    image: surgeryPhoto,
    imageAlt: "MDS Hospital surgical team preparing for patient care",
    featured: true,
    offerings: [
      "Surgical consultation and diagnosis",
      "Pre-operative assessment and theatre planning",
      "Post-operative review and wound care guidance",
      "Referral coordination where advanced specialist care is needed",
    ],
    benefits: [
      "Clear surgical pathway from consultation to recovery",
      "Coordinated theatre, ward, pharmacy, and laboratory support",
      "Follow-up guidance for safer recovery",
    ],
    journey: [
      "Register at reception or arrive through emergency support",
      "Meet the doctor for review and treatment planning",
      "Complete required laboratory or imaging investigations",
      "Proceed to theatre or receive a follow-up plan",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Will I need laboratory tests before surgery?",
        answer:
          "The doctor may request laboratory or imaging tests before surgery depending on the condition and planned procedure.",
      },
      commonFaqs.location,
    ],
    relatedSlugs: ["operating-theatre", "diagnostic-laboratory", "admission-ward-care"],
  },
  {
    slug: "minimal-access-surgery",
    title: "Minimal Access Surgery",
    shortTitle: "Minimal Access",
    seoTitle: "Minimal Access Surgery in Kano | MDS Hospital",
    summary:
      "Modern laparoscopic care designed to support smaller incisions, careful review, and smoother recovery planning.",
    description:
      "MDS Hospital offers minimal access surgery assessment and coordinated laparoscopic care for suitable patients in Kano.",
    keywords:
      "minimal access surgery Kano, laparoscopic surgery Kano, keyhole surgery Kano, MDS Hospital laparoscopy",
    icon: <FaStethoscope />,
    image: surgeryPhoto,
    imageAlt: "Minimal access surgery equipment and clinical setup",
    featured: true,
    offerings: [
      "Suitability review for laparoscopic procedures",
      "Pre-operative counselling and investigations",
      "Theatre scheduling and recovery planning",
      "Post-operative follow-up and medication guidance",
    ],
    benefits: [
      "Focused consultant review before procedure selection",
      "Coordinated diagnostics and theatre workflow",
      "Clear recovery instructions after care",
    ],
    journey: [
      "Book or request a surgical consultation",
      "Complete doctor review and required investigations",
      "Confirm procedure plan and theatre timing",
      "Return for review after discharge",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Is minimal access surgery suitable for everyone?",
        answer:
          "Suitability depends on the diagnosis, patient condition, and surgeon review. The doctor will explain the safest option.",
      },
      commonFaqs.coverage,
    ],
    relatedSlugs: ["general-surgery", "operating-theatre", "medical-imaging"],
  },
  {
    slug: "general-outpatient-care",
    title: "General Outpatient Care",
    shortTitle: "Outpatient Care",
    seoTitle: "Outpatient Clinic in Kano | MDS Hospital",
    summary:
      "Accessible consultations, diagnosis, prescriptions, and follow-up care for common health concerns.",
    description:
      "The MDS Hospital outpatient clinic in Giginyu, Kano supports new, returning, investigation, and reactivated patients with organized consultation and care.",
    keywords:
      "outpatient clinic Kano, doctor consultation Kano, hospital consultation Giginyu, MDS Hospital GOPD",
    icon: <FaClinicMedical />,
    image: consultantPhoto,
    imageAlt: "Doctor consultation at MDS Hospital",
    offerings: [
      "General medical consultation",
      "Patient registration and clinical triage",
      "Prescriptions and treatment planning",
      "Follow-up appointments and referrals",
    ],
    benefits: [
      "Simple front-desk flow for new and returning patients",
      "Access to laboratory, imaging, pharmacy, and specialist pathways",
      "Clear records for continuing care",
    ],
    journey: [
      "Register or find your existing patient record at reception",
      "See the doctor for consultation",
      "Complete tests or pick up medication if requested",
      "Receive a follow-up, referral, or admission plan",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Can returning patients use their existing record?",
        answer:
          "Yes. Returning patients can be searched by patient ID, phone number, or name at reception.",
      },
      commonFaqs.location,
    ],
    relatedSlugs: ["diagnostic-laboratory", "pharmacy-services", "specialist-clinics"],
  },
  {
    slug: "specialist-clinics",
    title: "Specialist Clinics",
    shortTitle: "Specialists",
    seoTitle: "Specialist Clinics in Kano | MDS Hospital",
    summary:
      "Coordinated access to medical doctors, visiting consultants, and visiting specialists.",
    description:
      "MDS Hospital provides specialist clinic access in Kano for patients who need focused clinical review, second opinions, and continuing care.",
    keywords:
      "specialist clinic Kano, visiting consultants Kano, medical specialists Kano, MDS Hospital specialists",
    icon: <FaHospital />,
    image: consultantPhoto,
    imageAlt: "Specialist doctor reviewing patient care",
    offerings: [
      "Specialist consultation scheduling",
      "Review of previous notes, results, and prescriptions",
      "Referral coordination between departments",
      "Follow-up planning for chronic or complex cases",
    ],
    benefits: [
      "Better continuity between reception, doctors, lab, pharmacy, and wards",
      "Clear referral path for patients who need specialist attention",
      "Organized review of clinical history",
    ],
    journey: [
      "Request specialist review at reception or through a doctor",
      "Confirm appointment time and required documents",
      "Complete consultation and requested tests",
      "Receive treatment, referral, or follow-up plan",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Can a doctor refer me to a specialist?",
        answer:
          "Yes. A doctor can refer you internally or to an external specialist depending on your care needs.",
      },
      commonFaqs.coverage,
    ],
    relatedSlugs: ["general-outpatient-care", "medical-imaging", "diagnostic-laboratory"],
  },
  {
    slug: "diagnostic-laboratory",
    title: "Diagnostic Laboratory",
    shortTitle: "Laboratory",
    seoTitle: "Medical Laboratory in Kano | MDS Hospital",
    summary:
      "Reliable laboratory investigations that support diagnosis, treatment decisions, and follow-up care.",
    description:
      "MDS Hospital laboratory services in Kano support outpatient, inpatient, emergency, maternity, and specialist care with organized test handling and reporting.",
    keywords:
      "medical laboratory Kano, lab test Kano, diagnostic laboratory Giginyu, MDS Hospital lab",
    icon: <FaMicroscope />,
    image: laboratoryPhoto,
    imageAlt: "MDS Hospital laboratory testing area",
    offerings: [
      "Doctor-requested laboratory investigations",
      "Investigation patient registration",
      "Result preparation for clinical review",
      "Support for outpatient, ward, maternity, and emergency cases",
    ],
    benefits: [
      "Structured result workflow for doctors and patients",
      "Supports faster clinical decision making",
      "Helpful for new, returning, and investigation-only patients",
    ],
    journey: [
      "Register as a patient or investigation patient",
      "Submit the test request at the laboratory",
      "Complete sample collection where required",
      "Return results to the requesting doctor or patient record",
    ],
    faqs: [
      {
        question: "Can I come only for a laboratory investigation?",
        answer:
          "Yes. Investigation patients can be registered for laboratory services and converted to hospital patients later if needed.",
      },
      commonFaqs.appointment,
      commonFaqs.location,
    ],
    relatedSlugs: ["general-outpatient-care", "specialist-clinics", "medical-imaging"],
  },
  {
    slug: "medical-imaging",
    title: "Radiology, Scanning and ECG",
    shortTitle: "Imaging",
    seoTitle: "Radiology, Scanning and ECG in Kano | MDS Hospital",
    summary:
      "Imaging, scanning, and ECG support for diagnosis, monitoring, and specialist review.",
    description:
      "MDS Hospital supports medical imaging, scanning, and ECG services in Kano to help doctors evaluate patients accurately.",
    keywords:
      "radiology Kano, scan Kano, ECG Kano, medical imaging Giginyu, MDS Hospital scanning",
    icon: <FaHeartbeat />,
    image: laboratoryRoomPhoto,
    imageAlt: "Medical imaging service at MDS Hospital",
    offerings: [
      "Doctor-requested scans and imaging support",
      "ECG support for cardiac evaluation",
      "Result coordination with patient records",
      "Referral support for advanced imaging where needed",
    ],
    benefits: [
      "Better diagnostic clarity for doctors",
      "Useful for outpatient, emergency, specialist, and admission cases",
      "Organized reporting for future review",
    ],
    journey: [
      "Receive a doctor request or referral",
      "Confirm the required scan, imaging, or ECG at reception",
      "Complete the procedure",
      "Return the result to the requesting doctor",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Will my result be available to the doctor?",
        answer:
          "Yes. Results are coordinated with the patient record so the doctor can review them during care.",
      },
      commonFaqs.coverage,
    ],
    relatedSlugs: ["diagnostic-laboratory", "specialist-clinics", "general-outpatient-care"],
  },
  {
    slug: "pharmacy-services",
    title: "Pharmacy Services",
    shortTitle: "Pharmacy",
    seoTitle: "Hospital Pharmacy in Kano | MDS Hospital",
    summary:
      "Medication dispensing, counselling, stock guidance, and treatment continuity from the hospital pharmacy.",
    description:
      "The MDS Hospital pharmacy in Kano supports prescriptions from doctors, medication counselling, invoices, receipts, and patient medication continuity.",
    keywords:
      "hospital pharmacy Kano, pharmacy Giginyu, prescription medicine Kano, MDS Hospital pharmacy",
    icon: <FaCapsules />,
    image: pharmacyPhoto,
    imageAlt: "Pharmacy shelves and medication service",
    offerings: [
      "Prescription dispensing",
      "Medicine counselling and dosage guidance",
      "Patient-linked invoices and receipts",
      "Medication support for wards and outpatient care",
    ],
    benefits: [
      "Medicines are connected to the patient care journey",
      "Supports safer use through counselling",
      "Clear receipts for patients and accounts",
    ],
    journey: [
      "Receive prescription from the doctor",
      "Submit it to pharmacy for availability and pricing",
      "Collect medicine with dosage guidance",
      "Keep receipt for records or insurance processing",
    ],
    faqs: [
      {
        question: "Can pharmacy sales be linked to a patient?",
        answer:
          "Yes. Pharmacy records can be linked to a specific patient for better care history and billing.",
      },
      commonFaqs.coverage,
      commonFaqs.location,
    ],
    relatedSlugs: ["general-outpatient-care", "admission-ward-care", "maternity-labour-room"],
  },
  {
    slug: "maternity-labour-room",
    title: "Maternity and Labour Room",
    shortTitle: "Maternity",
    seoTitle: "Maternity and Labour Room in Kano | MDS Hospital",
    summary:
      "Maternal care, labour room coordination, postnatal support, and family-focused clinical guidance.",
    description:
      "MDS Hospital offers maternity and labour room services in Kano with coordinated support from doctors, nurses, laboratory, pharmacy, and wards.",
    keywords:
      "maternity hospital Kano, labour room Kano, delivery hospital Giginyu, MDS Hospital maternity",
    icon: <FaUsers />,
    image: nursingPhoto,
    imageAlt: "MDS Hospital nursing team supporting patient care",
    offerings: [
      "Maternity assessment and labour room support",
      "Postnatal monitoring and follow-up guidance",
      "Laboratory and pharmacy coordination",
      "Ward admission support where required",
    ],
    benefits: [
      "Care coordinated across reception, doctors, nurses, lab, and pharmacy",
      "Clear patient records for mother and child care",
      "Access to emergency support when needed",
    ],
    journey: [
      "Register at reception or arrive through emergency",
      "Complete maternity assessment",
      "Move to labour room, ward, or follow-up care as needed",
      "Receive postnatal advice and appointment guidance",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Can maternity patients be admitted?",
        answer:
          "Yes. Admission can be arranged when the doctor or maternity team determines that ward care is required.",
      },
      commonFaqs.location,
    ],
    relatedSlugs: ["antenatal-care", "admission-ward-care", "diagnostic-laboratory"],
  },
  {
    slug: "antenatal-care",
    title: "Antenatal Care",
    shortTitle: "ANC",
    seoTitle: "Antenatal Care in Kano | MDS Hospital",
    summary:
      "Pregnancy monitoring, health education, investigations, and follow-up care for mothers.",
    description:
      "MDS Hospital provides antenatal care in Kano, helping expectant mothers monitor pregnancy, complete investigations, and plan delivery safely.",
    keywords:
      "antenatal care Kano, ANC clinic Kano, pregnancy clinic Giginyu, MDS Hospital ANC",
    icon: <FaHeartbeat />,
    image: nursingPhoto,
    imageAlt: "Nursing team at MDS Hospital",
    offerings: [
      "Pregnancy review and routine monitoring",
      "Laboratory investigations and medication support",
      "Health education and follow-up planning",
      "Delivery and referral planning where needed",
    ],
    benefits: [
      "Regular monitoring for mother and baby",
      "Smooth connection to maternity and labour room services",
      "Better preparation for delivery and follow-up",
    ],
    journey: [
      "Register for ANC at reception",
      "Complete routine checks and clinical review",
      "Carry out requested tests or scans",
      "Return for scheduled follow-up visits",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Does ANC connect to maternity care?",
        answer:
          "Yes. ANC records help the maternity team understand the pregnancy history when delivery care is needed.",
      },
      commonFaqs.coverage,
    ],
    relatedSlugs: ["maternity-labour-room", "diagnostic-laboratory", "medical-imaging"],
  },
  {
    slug: "immunisation",
    title: "Immunisation",
    shortTitle: "Immunisation",
    seoTitle: "Immunisation Services in Kano | MDS Hospital",
    summary:
      "Preventive vaccination support and patient guidance for children, families, and routine care needs.",
    description:
      "MDS Hospital supports immunisation and preventive healthcare services in Kano as part of family and community care.",
    keywords:
      "immunisation Kano, vaccination Kano, child immunisation Giginyu, MDS Hospital vaccines",
    icon: <FaShieldAlt />,
    image: nursingPhoto,
    imageAlt: "Nurses supporting preventive healthcare",
    offerings: [
      "Routine immunisation guidance",
      "Preventive health counselling",
      "Child and family healthcare support",
      "Record keeping for continuing care",
    ],
    benefits: [
      "Supports prevention and long-term health",
      "Helpful records for future hospital visits",
      "Connects families to other clinical services when needed",
    ],
    journey: [
      "Confirm immunisation needs at reception",
      "Complete review with the care team",
      "Receive immunisation or guidance",
      "Keep the record for follow-up visits",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Can immunisation records be kept?",
        answer:
          "Yes. Patient records can support future review and continuity of care.",
      },
      commonFaqs.location,
    ],
    relatedSlugs: ["antenatal-care", "maternity-labour-room", "general-outpatient-care"],
  },
  {
    slug: "admission-ward-care",
    title: "Admission and Ward Care",
    shortTitle: "Ward Care",
    seoTitle: "Hospital Admission and Ward Care in Kano | MDS Hospital",
    summary:
      "Inpatient monitoring, bed assignment, medication routines, and coordinated ward care.",
    description:
      "MDS Hospital provides admission and ward care in Kano for patients who need inpatient monitoring, treatment, nursing care, and doctor review.",
    keywords:
      "hospital admission Kano, ward care Kano, inpatient hospital Giginyu, MDS Hospital wards",
    icon: <FaBed />,
    image: nursingPhoto,
    imageAlt: "Ward nursing care at MDS Hospital",
    offerings: [
      "Ward and bed assignment",
      "Doctor and nurse monitoring",
      "Medication administration support",
      "Discharge and follow-up planning",
    ],
    benefits: [
      "Clear care responsibilities during admission",
      "Medication and dosage reminders for nursing teams",
      "Better continuity between doctor notes, lab results, and pharmacy",
    ],
    journey: [
      "Doctor or reception assigns the patient to a ward",
      "Nurses monitor care and medication schedules",
      "Doctor reviews progress and requests tests when needed",
      "Patient is discharged with follow-up guidance",
    ],
    faqs: [
      {
        question: "Who can assign a patient to a ward?",
        answer:
          "Doctors and authorized reception staff can assign patients to available wards and beds.",
      },
      commonFaqs.coverage,
      commonFaqs.location,
    ],
    relatedSlugs: ["general-outpatient-care", "pharmacy-services", "diagnostic-laboratory"],
  },
  {
    slug: "emergency-support",
    title: "Emergency Support",
    shortTitle: "Emergency",
    seoTitle: "Emergency Hospital Support in Kano | MDS Hospital",
    summary:
      "Prompt assessment and stabilization for patients who need urgent medical attention.",
    description:
      "MDS Hospital provides emergency support in Giginyu, Kano for urgent cases requiring quick assessment, stabilization, referral, admission, or treatment.",
    keywords:
      "emergency hospital Kano, urgent care Kano, emergency support Giginyu, MDS Hospital emergency",
    icon: <FaAmbulance />,
    image: hospitalExterior,
    imageAlt: "MDS Hospital building in Kano",
    offerings: [
      "Urgent assessment and triage",
      "Stabilization and doctor review",
      "Admission, referral, or discharge planning",
      "SEMSAS and ambulance-related documentation where applicable",
    ],
    benefits: [
      "Fast entry point for urgent care",
      "Connection to lab, imaging, theatre, wards, and pharmacy",
      "Clear next step after assessment",
    ],
    journey: [
      "Arrive directly or through ambulance support",
      "Complete emergency assessment",
      "Receive stabilization and doctor review",
      "Move to admission, referral, theatre, or follow-up care",
    ],
    faqs: [
      {
        question: "What number should I call for emergency help?",
        answer:
          "For urgent assistance, call MDS Hospital emergency contact on 0708 229 7430.",
      },
      commonFaqs.location,
      {
        question: "Can emergency patients be registered later?",
        answer:
          "Yes. In urgent cases, basic care can begin first and complete registration details can be added later.",
      },
    ],
    relatedSlugs: ["admission-ward-care", "operating-theatre", "diagnostic-laboratory"],
  },
  {
    slug: "operating-theatre",
    title: "Operating Theatre",
    shortTitle: "Theatre",
    seoTitle: "Operating Theatre in Kano | MDS Hospital",
    summary:
      "Structured theatre workflows for safe surgical and procedural care.",
    description:
      "The MDS Hospital operating theatre supports planned and urgent procedures with coordinated surgical, nursing, pharmacy, and recovery workflows.",
    keywords:
      "operating theatre Kano, surgical theatre Kano, theatre hospital Giginyu, MDS Hospital theatre",
    icon: <FaSyringe />,
    image: surgeryPhoto,
    imageAlt: "Operating theatre service at MDS Hospital",
    offerings: [
      "Theatre scheduling and preparation",
      "Procedure documentation",
      "Medication, consumables, and recovery support",
      "Post-procedure follow-up planning",
    ],
    benefits: [
      "Organized surgical pathway for patients",
      "Supports both planned and urgent procedures",
      "Connects procedure records to patient history",
    ],
    journey: [
      "Doctor confirms theatre need",
      "Patient completes preparation and required tests",
      "Procedure is carried out in theatre",
      "Patient moves to recovery, ward, or discharge follow-up",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Can theatre care connect to ward admission?",
        answer:
          "Yes. Patients can be admitted to a ward before or after theatre care depending on their condition.",
      },
      commonFaqs.coverage,
    ],
    relatedSlugs: ["general-surgery", "minimal-access-surgery", "admission-ward-care"],
  },
  {
    slug: "dental-ophthalmology",
    title: "Dental and Ophthalmology",
    shortTitle: "Dental and Eye",
    seoTitle: "Dental and Eye Clinic in Kano | MDS Hospital",
    summary:
      "Focused dental and eye clinic support for patient review, treatment planning, and referral needs.",
    description:
      "MDS Hospital supports dental and ophthalmology care in Kano, including eye checks, focused review, and appropriate referral pathways.",
    keywords:
      "dental clinic Kano, eye clinic Kano, ophthalmology Kano, MDS Hospital eye check",
    icon: (
      <>
        <FaTooth />
        <FaEye />
      </>
    ),
    image: dentistPhoto,
    imageAlt: "Eye check service at MDS Hospital",
    offerings: [
      "Eye checks and clinical review",
      "Dental assessment and treatment guidance",
      "Specialist referral where needed",
      "Follow-up planning and patient record updates",
    ],
    benefits: [
      "Dedicated review for oral and eye health concerns",
      "Clear referral options for advanced specialist needs",
      "Easy connection to pharmacy and follow-up care",
    ],
    journey: [
      "Register for dental or eye clinic review",
      "Complete focused assessment",
      "Receive treatment guidance, prescription, or referral",
      "Return for follow-up where required",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Can I be referred after an eye or dental review?",
        answer:
          "Yes. The clinic can guide patients to specialist referral where advanced care is required.",
      },
      commonFaqs.location,
    ],
    relatedSlugs: ["general-outpatient-care", "pharmacy-services", "specialist-clinics"],
  },
  {
    slug: "dressing-wound-care",
    title: "Dressing and Wound Care",
    shortTitle: "Dressing",
    seoTitle: "Dressing and Wound Care in Kano | MDS Hospital",
    summary:
      "Clean wound dressing, review support, and follow-up guidance for healing and recovery.",
    description:
      "MDS Hospital provides dressing and wound care support in Kano for post-operative patients, injuries, and follow-up treatment needs.",
    keywords:
      "wound dressing Kano, wound care Kano, dressing clinic Giginyu, MDS Hospital dressing",
    icon: <FaFirstAid />,
    image: nursingPhoto,
    imageAlt: "Nursing team providing patient care",
    offerings: [
      "Wound dressing and review support",
      "Post-operative wound care guidance",
      "Medication and infection-prevention advice",
      "Follow-up scheduling when needed",
    ],
    benefits: [
      "Cleaner follow-up pathway for healing wounds",
      "Supports surgery, emergency, and outpatient care",
      "Records can stay connected to the patient history",
    ],
    journey: [
      "Register or find your patient record",
      "Complete nurse or doctor review",
      "Receive dressing and care instructions",
      "Return for scheduled wound checks",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Is dressing available after surgery?",
        answer:
          "Yes. Dressing and wound review can support patients recovering from surgery or injuries.",
      },
      commonFaqs.location,
    ],
    relatedSlugs: ["general-surgery", "general-outpatient-care", "pharmacy-services"],
  },
  {
    slug: "physiotherapy",
    title: "Physiotherapy",
    shortTitle: "Physiotherapy",
    seoTitle: "Physiotherapy Support in Kano | MDS Hospital",
    summary:
      "Rehabilitation guidance and movement support for recovery, mobility, and long-term function.",
    description:
      "MDS Hospital offers physiotherapy support in Kano for patients who need rehabilitation guidance after illness, injury, surgery, or mobility challenges.",
    keywords:
      "physiotherapy Kano, rehabilitation Kano, physical therapy Giginyu, MDS Hospital physiotherapy",
    icon: <FaHeartbeat />,
    image: consultantPhoto,
    imageAlt: "Clinical consultation and rehabilitation planning",
    offerings: [
      "Mobility and recovery assessment",
      "Rehabilitation planning",
      "Follow-up guidance for home exercises",
      "Doctor referral coordination",
    ],
    benefits: [
      "Supports recovery after injury, illness, or surgery",
      "Connects rehabilitation with doctor notes and patient history",
      "Encourages safer return to daily activity",
    ],
    journey: [
      "Receive referral or request physiotherapy review",
      "Complete assessment and recovery planning",
      "Follow the care plan and return for review",
      "Update the doctor or care team on progress",
    ],
    faqs: [
      commonFaqs.appointment,
      {
        question: "Can physiotherapy follow surgery?",
        answer:
          "Yes. Physiotherapy may be recommended after surgery, injury, or admission depending on the doctor's plan.",
      },
      commonFaqs.location,
    ],
    relatedSlugs: ["general-surgery", "admission-ward-care", "general-outpatient-care"],
  },
];

export function findPublicService(slug?: string) {
  return publicServices.find((service) => service.slug === slug);
}

export function getRelatedServices(service: PublicService) {
  return service.relatedSlugs
    .map((slug) => findPublicService(slug))
    .filter((item): item is PublicService => Boolean(item));
}
