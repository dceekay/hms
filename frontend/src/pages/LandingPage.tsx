import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FaAmbulance,
  FaBed,
  FaCapsules,
  FaCheckCircle,
  FaChevronDown,
  FaClinicMedical,
  FaFacebookF,
  FaHeartbeat,
  FaHospital,
  FaInstagram,
  FaMicroscope,
  FaPhoneAlt,
  FaShieldAlt,
  FaStethoscope,
  FaSyringe,
  FaUserMd,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import {
  FiArrowRight,
  FiClock,
  FiExternalLink,
  FiMapPin,
  FiMenu,
  FiPhoneCall,
} from "react-icons/fi";
import { useState } from "react";

import mdsHospital from "../assets/mds.png";
import mdsLogo from "../assets/logo.png";
import medicalDirector from "../assets/dr.jpg";
import patientJourneyEnglish from "../assets/patient-journey-en.png";
import patientJourneyBilingual from "../assets/patient-journey-bilingual.png";

import "../styles/landing.css";

const services = [
  {
    title: "General Surgery",
    description:
      "Comprehensive surgical assessment and treatment delivered by experienced specialists.",
    icon: <FaUserMd />,
    featured: true,
  },
  {
    title: "Minimal Access Surgery",
    description:
      "Modern laparoscopic procedures designed to support smaller incisions and faster recovery.",
    icon: <FaStethoscope />,
    featured: true,
  },
  {
    title: "General Outpatient Care",
    description:
      "Accessible consultations, diagnosis, treatment planning, and continuing care.",
    icon: <FaClinicMedical />,
  },
  {
    title: "Specialist Clinics",
    description:
      "Coordinated consultations with medical doctors, visiting consultants, and specialists.",
    icon: <FaHospital />,
  },
  {
    title: "Diagnostic Laboratory",
    description:
      "Reliable laboratory investigations supporting timely clinical decisions.",
    icon: <FaMicroscope />,
  },
  {
    title: "Medical Imaging",
    description:
      "Scanning and diagnostic imaging services supporting accurate evaluation.",
    icon: <FaHeartbeat />,
  },
  {
    title: "Pharmacy Services",
    description:
      "Safe medication dispensing, counselling, and continuity-of-care support.",
    icon: <FaCapsules />,
  },
  {
    title: "Maternal & Family Care",
    description:
      "Antenatal care, immunisation, family planning, and reproductive health support.",
    icon: <FaUsers />,
  },
  {
    title: "Admission & Ward Care",
    description:
      "Compassionate inpatient monitoring with coordinated nursing and medical support.",
    icon: <FaBed />,
  },
  {
    title: "Emergency Support",
    description:
      "Responsive assessment and stabilisation for patients requiring urgent medical attention.",
    icon: <FaAmbulance />,
  },
  {
    title: "Operating Theatre",
    description:
      "Structured theatre workflows supporting safe surgical and procedural care.",
    icon: <FaSyringe />,
  },
  {
    title: "Preventive Healthcare",
    description:
      "Screening, health education, immunisation, and wellness-focused interventions.",
    icon: <FaShieldAlt />,
  },
];

const patientSteps = [
  {
    number: "01",
    title: "Entry and security",
    description:
      "Patients and visitors receive guidance and identification support where applicable.",
  },
  {
    number: "02",
    title: "Reception and registration",
    description:
      "New, returning, investigation, and reactivated patients are processed efficiently.",
  },
  {
    number: "03",
    title: "Consultation",
    description:
      "Patients are directed to GOPD, general clinic, or an appropriate specialist.",
  },
  {
    number: "04",
    title: "Clinical services",
    description:
      "Laboratory, pharmacy, imaging, specialist investigations, and preventive services.",
  },
  {
    number: "05",
    title: "Admission or procedure",
    description:
      "Ward admission, surgery, or labour room support is arranged when required.",
  },
  {
    number: "06",
    title: "Discharge and follow-up",
    description:
      "Patients receive prescriptions, referrals, aftercare advice, and follow-up plans.",
  },
];

const schemes = [
  "NHIA",
  "KSCHIMA",
  "JICHMA",
  "HMOs",
  "Retainership",
  "Wallet",
  "Referrals",
  "SEMSAS Hospital Services",
  "SEMSAS Ambulance Service",
  "BHCPP 2.0",
];

const qualifications = [
  {
    school: "University of Washington, USA",
    qualification:
      "Certificate in Leadership and Management in Health and Healthcare Administration",
    year: "2016",
  },
  {
    school: "World Laparoscopy Hospital",
    qualification:
      "Fellowship in Minimal Access Surgery — General Surgery",
    year: "2014",
  },
  {
    school: "Rostov State Medical University",
    qualification:
      "MSc and PhD in General Surgery, Laparoscopy and Minimal Access Surgery",
    year: "2004 – 2009",
  },
  {
    school: "Saint Petersburg State Medical University",
    qualification:
      "Doctor of Medicine — General Medicine and Physician Training",
    year: "1990 – 1997",
  },
];

const trustItems = [
  "Consultant-led clinical services",
  "Accredited healthcare coverage schemes",
  "Secure digital patient coordination",
  "Structured referrals and follow-up",
  "Emergency and ambulance support",
  "English and Hausa patient guidance",
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
  const [journeyLanguage, setJourneyLanguage] = useState("bilingual");

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
            24/7 Emergency and Ambulance Support
          </span>

          <a href="tel:+2340000000000">
            <FiPhoneCall />
            Emergency line: Add hospital number
          </a>
        </div>
      </div>

      {/* Navigation */}
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          <img src={mdsLogo} alt="MDS Hospital logo" />

          <div>
            <strong>MDS Hospital</strong>
            <span>Patient Care, Reimagined</span>
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
            About
          </a>
          <a href="#services" onClick={scrollToSection}>
            Services
          </a>
          <a href="#journey" onClick={scrollToSection}>
            Patient journey
          </a>
          <a href="#leadership" onClick={scrollToSection}>
            Leadership
          </a>
          <a href="#contact" onClick={scrollToSection}>
            Contact
          </a>

          <Link
            to="/login"
            className="landing-nav-cta"
            onClick={scrollToSection}
          >
            Staff portal
            <FiArrowRight />
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-background-glow hero-glow-one" />
          <div className="hero-background-glow hero-glow-two" />

          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="visible"
            variants={reveal}
          >
            <div className="hero-badge">
              <FaCheckCircle />
              NHIS, KACHMA and JICHMA accredited
            </div>

            <p className="eyebrow">Compassionate care. Modern precision.</p>

            <h1>
              Expert healthcare built around{" "}
              <span>every patient’s journey.</span>
            </h1>

            <p className="hero-text">
              MDS Hospital provides coordinated medical, surgical, diagnostic,
              pharmacy, emergency, and preventive healthcare services in a
              calm, safe, and patient-focused environment.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="primary-btn">
                Book an appointment
                <FiArrowRight />
              </a>

              <a href="#services" className="secondary-btn">
                Explore our services
              </a>
            </div>

            <div className="hero-assurances">
              <div>
                <FaUserMd />
                <span>
                  <strong>Specialist-led care</strong>
                  Experienced clinical professionals
                </span>
              </div>

              <div>
                <FiClock />
                <span>
                  <strong>Responsive service</strong>
                  Emergency support available
                </span>
              </div>

              <div>
                <FaShieldAlt />
                <span>
                  <strong>Secure coordination</strong>
                  Protected digital patient workflows
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="hero-image-wrapper">
              <img
                src={mdsHospital}
                alt="MDS Hospital clinical care environment"
              />

              <div className="hero-image-overlay" />

              <div className="hero-floating-card hero-floating-top">
                <span className="floating-icon">
                  <FaHeartbeat />
                </span>

                <div>
                  <strong>Patient-first care</strong>
                  <small>From arrival to recovery</small>
                </div>
              </div>

              <div className="hero-floating-card hero-floating-bottom">
                <span className="live-indicator" />

                <div>
                  <strong>Emergency services</strong>
                  <small>Responsive clinical support</small>
                </div>
              </div>
            </div>
          </motion.div>

          <a href="#about" className="scroll-indicator">
            Discover MDS Hospital
            <FaChevronDown />
          </a>
        </section>

        {/* Quick actions */}
        <section className="quick-actions">
          <a href="#contact">
            <span>
              <FiPhoneCall />
            </span>
            <div>
              <small>Speak with our team</small>
              <strong>Contact reception</strong>
            </div>
            <FiArrowRight />
          </a>

          <a href="#journey">
            <span>
              <FaHospital />
            </span>
            <div>
              <small>Understand your visit</small>
              <strong>View patient journey</strong>
            </div>
            <FiArrowRight />
          </a>

          <a href="#schemes">
            <span>
              <FaShieldAlt />
            </span>
            <div>
              <small>Coverage and payment</small>
              <strong>View accepted schemes</strong>
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
            <img src={mdsHospital} alt="Healthcare services at MDS Hospital" />

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
            <p className="eyebrow">Welcome to MDS Hospital</p>

            <h2>
              A modern care environment grounded in compassion, competence,
              and trust.
            </h2>

            <p>
              Our teams work across outpatient care, specialist consultations,
              diagnostics, pharmacy, surgical services, admission, preventive
              healthcare, and aftercare to provide a smoother experience for
              patients and their families.
            </p>

            <p>
              From the moment a patient enters the hospital, every stage is
              carefully coordinated to reduce uncertainty, improve
              communication, and support better clinical decisions.
            </p>

            <div className="trust-grid">
              {trustItems.map((item) => (
                <div key={item}>
                  <FaCheckCircle />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <a href="#journey" className="text-link">
              See how patients move through our hospital
              <FiArrowRight />
            </a>
          </motion.div>
        </section>

        {/* Services */}
        <section id="services" className="services-section page-section">
          <div className="section-heading centered-heading">
            <p className="eyebrow">Specialties and services</p>
            <h2>Healthcare support for every stage of the patient experience.</h2>
            <p>
              Integrated clinical services designed to improve access,
              diagnosis, treatment, recovery, and follow-up.
            </p>
          </div>

          <div className="services-grid">
            {services.map((service, index) => (
              <motion.article
                key={service.title}
                className={`service-card ${
                  service.featured ? "service-card-featured" : ""
                }`}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{
                  duration: 0.42,
                  delay: Math.min(index * 0.04, 0.24),
                }}
                whileHover={{ y: -8 }}
              >
                <div className="service-icon">{service.icon}</div>

                {service.featured && (
                  <span className="featured-label">Specialist service</span>
                )}

                <h3>{service.title}</h3>
                <p>{service.description}</p>

                <a href="#contact">
                  Enquire about service
                  <FiArrowRight />
                </a>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Emergency banner */}
        <section className="emergency-section">
          <div className="emergency-content">
            <div className="emergency-icon">
              <FaAmbulance />
            </div>

            <div>
              <p className="eyebrow">Emergency support</p>
              <h2>Need urgent medical assistance?</h2>
              <p>
                Contact MDS Hospital immediately or visit the hospital for
                prompt assessment and clinical support.
              </p>
            </div>
          </div>

          <div className="emergency-actions">
            <a href="tel:+2340000000000" className="emergency-call-btn">
              <FaPhoneAlt />
              Call emergency line
            </a>

            <a href="#contact" className="emergency-location-btn">
              <FiMapPin />
              Get directions
            </a>
          </div>
        </section>

        {/* Journey */}
        <section id="journey" className="journey-section page-section">
          <div className="section-heading">
            <p className="eyebrow">Your visit, clearly explained</p>
            <h2>A coordinated journey from entrance to follow-up.</h2>
            <p>
              Our service pathway helps patients and relatives understand what
              to expect at every stage of their visit.
            </p>
          </div>

          <div className="journey-layout">
            <div className="journey-steps">
              {patientSteps.map((step, index) => (
                <motion.article
                  key={step.number}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                >
                  <span>{step.number}</span>

                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </motion.article>
              ))}
            </div>

            <motion.div
              className="journey-preview"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55 }}
            >
              <div className="journey-preview-header">
                <div>
                  <small>Patient service guide</small>
                  <strong>
                    {journeyLanguage === "bilingual"
                      ? "English and Hausa"
                      : "English version"}
                  </strong>
                </div>

                <div className="language-switch">
                  <button
                    type="button"
                    className={
                      journeyLanguage === "bilingual" ? "active" : ""
                    }
                    onClick={() => setJourneyLanguage("bilingual")}
                  >
                    EN / HA
                  </button>

                  <button
                    type="button"
                    className={journeyLanguage === "english" ? "active" : ""}
                    onClick={() => setJourneyLanguage("english")}
                  >
                    English
                  </button>
                </div>
              </div>

              <a
                href={
                  journeyLanguage === "bilingual"
                    ? patientJourneyBilingual
                    : patientJourneyEnglish
                }
                target="_blank"
                rel="noreferrer"
                className="journey-image-link"
              >
                <img
                  src={
                    journeyLanguage === "bilingual"
                      ? patientJourneyBilingual
                      : patientJourneyEnglish
                  }
                  alt="MDS Hospital patient journey and service map"
                />

                <span>
                  Open full service map
                  <FiExternalLink />
                </span>
              </a>
            </motion.div>
          </div>
        </section>

        {/* Coverage schemes */}
        <section id="schemes" className="schemes-section">
          <div className="schemes-copy">
            <p className="eyebrow">Coverage and service schemes</p>
            <h2>Multiple options for accessible healthcare.</h2>
            <p>
              MDS Hospital supports a range of health insurance, government,
              referral, retainership, and direct-payment arrangements.
            </p>
          </div>

          <div className="schemes-grid">
            {schemes.map((scheme) => (
              <div key={scheme}>
                <FaShieldAlt />
                <span>{scheme}</span>
              </div>
            ))}
          </div>

          <div className="scheme-note">
            <FaCheckCircle />
            <p>
              Coverage may depend on eligibility, authorisation, service type,
              and the terms of the patient’s scheme. Some specialised services
              may attract separate billing.
            </p>
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
              />

              <div className="director-photo-overlay">
                <small>Chief Executive Officer</small>
                <strong>Dr. Abdulkadir Yakubu</strong>
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

            <h2>Experienced leadership guiding modern patient care.</h2>

            <h3>Dr. Abdulkadir Yakubu</h3>

            <div className="director-titles">
              <span>Consultant General Surgeon</span>
              <span>Chief Executive Officer, MDS Hospital</span>
              <span>
                Director and Programme Manager, SEMCHiC, Jigawa State Ministry
                of Health
              </span>
            </div>

            <p className="director-introduction">
              Dr. Abdulkadir Yakubu brings extensive experience in general
              surgery, laparoscopic and minimal access surgery, clinical
              leadership, and health programme management.
            </p>

            <div className="qualifications">
              {qualifications.map((item) => (
                <article key={`${item.school}-${item.year}`}>
                  <span>{item.year}</span>

                  <div>
                    <h4>{item.school}</h4>
                    <p>{item.qualification}</p>
                  </div>
                </article>
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
                  <img src={mdsLogo} alt="" />
                </span>

                <div>
                  <strong>MDS Care Coordination</strong>
                  <small>Secure hospital workflow</small>
                </div>
              </div>

              <div className="dashboard-progress">
                <span>Patient journey progress</span>
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
            <p className="eyebrow">Visit or contact MDS Hospital</p>

            <h2>Let our team guide you to the right care.</h2>

            <p>
              Contact reception for appointments, specialist clinic schedules,
              coverage enquiries, referrals, and hospital directions.
            </p>

            <div className="contact-details">
              <a href="tel:+2340000000000">
                <span>
                  <FiPhoneCall />
                </span>

                <div>
                  <small>Call MDS Hospital</small>
                  <strong>Add official phone number</strong>
                </div>
              </a>

              <div>
                <span>
                  <FiMapPin />
                </span>

                <div>
                  <small>Hospital address</small>
                  <strong>Add official MDS Hospital address</strong>
                </div>
              </div>

              <div>
                <span>
                  <FiClock />
                </span>

                <div>
                  <small>Opening hours</small>
                  <strong>Emergency services available 24/7</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="appointment-card">
            <div className="appointment-icon">
              <FaUserMd />
            </div>

            <p className="eyebrow">Appointments</p>
            <h3>Request a consultation</h3>

            <p>
              Speak with our reception team to confirm clinic availability and
              prepare for your visit.
            </p>

            <a
              href="https://wa.me/2340000000000"
              className="whatsapp-btn"
              target="_blank"
              rel="noreferrer"
            >
              <FaWhatsapp />
              Chat with reception
            </a>

            <a href="tel:+2340000000000" className="call-btn">
              <FaPhoneAlt />
              Call the hospital
            </a>

            <small className="appointment-notice">
              Replace the placeholder links with the official hospital contact
              details.
            </small>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/">
              <img src={mdsLogo} alt="MDS Hospital" />

              <div>
                <strong>MDS Hospital</strong>
                <span>Patient Care, Reimagined</span>
              </div>
            </Link>

            <p>
              Compassionate, specialist-led healthcare supported by coordinated
              clinical services and modern hospital systems.
            </p>

            <div className="social-links">
              <a href="#facebook" aria-label="Facebook">
                <FaFacebookF />
              </a>
              <a href="#instagram" aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href="#whatsapp" aria-label="WhatsApp">
                <FaWhatsapp />
              </a>
            </div>
          </div>

          <div className="footer-column">
            <h4>Hospital</h4>
            <a href="#about">About MDS</a>
            <a href="#leadership">Leadership</a>
            <a href="#journey">Patient journey</a>
            <a href="#schemes">Coverage schemes</a>
          </div>

          <div className="footer-column">
            <h4>Clinical services</h4>
            <a href="#services">General surgery</a>
            <a href="#services">Specialist clinics</a>
            <a href="#services">Diagnostics</a>
            <a href="#services">Pharmacy</a>
          </div>

          <div className="footer-column">
            <h4>Quick access</h4>
            <Link to="/login">Staff portal</Link>
            <a href="#contact">Appointments</a>
            <a href="#contact">Emergency contact</a>
            <a href="#contact">Hospital directions</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} MDS Hospital. All rights reserved.
          </span>

          <span>NHIS / KACHMA / JICHMA Accredited</span>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/2340000000000"
        className="floating-whatsapp"
        target="_blank"
        rel="noreferrer"
        aria-label="Contact MDS Hospital on WhatsApp"
      >
        <FaWhatsapp />
        <span>Chat with us</span>
      </a>
    </div>
  );
}