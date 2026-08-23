import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaHospital, FaWhatsapp } from "react-icons/fa";
import { FiArrowRight, FiMapPin, FiPhoneCall } from "react-icons/fi";

import mdsLogo from "../assets/optimized/logo.png";
import { publicServices } from "../data/publicServices";
import { applySeo, seoSiteUrl } from "../utils/seo";

import "../styles/landing.css";

const emergencyTel = "tel:+2347082297430";
const whatsappUrl =
  "https://wa.me/2349137526952?text=Hello%20MDS%20Hospital%2C%20I%20would%20like%20to%20ask%20about%20your%20services.";

export default function ServicesIndexPage() {
  useEffect(() => {
    applySeo({
      title: "Hospital Services in Kano | MDS Hospital",
      description:
        "Explore MDS Hospital services in Giginyu, Kano including outpatient care, surgery, laboratory, radiology, pharmacy, maternity, ward admission, emergency care, dental, eye clinic and physiotherapy.",
      canonicalPath: "/services",
      keywords:
        "MDS Hospital services, hospital services Kano, medical services Giginyu, surgery Kano, lab Kano, pharmacy Kano",
      imageAlt: "MDS Hospital entrance in Giginyu, Kano",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "MDS Hospital Services",
        url: `${seoSiteUrl}/services`,
        description:
          "A directory of clinical and support services available at MDS Hospital in Giginyu, Kano.",
        mainEntity: publicServices.map((service) => ({
          "@type": "MedicalProcedure",
          name: service.title,
          url: `${seoSiteUrl}/services/${service.slug}`,
          description: service.summary,
        })),
      },
    });
  }, []);

  return (
    <main className="landing-page service-page service-index-page">
      <header className="service-topbar">
        <Link to="/" className="landing-brand service-brand">
          <img src={mdsLogo} alt="MDS Hospital logo" decoding="async" />
          <span>
            <strong>MDS Hospital</strong>
            <small>Giginyu, Kano</small>
          </span>
        </Link>

        <nav className="service-topnav" aria-label="Service navigation">
          <Link to="/">Home</Link>
          <a href={emergencyTel}>
            <FiPhoneCall />
            Emergency
          </a>
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            <FaWhatsapp />
            WhatsApp
          </a>
        </nav>
      </header>

      <section className="service-index-hero">
        <div>
          <p className="eyebrow">MDS Hospital services</p>
          <h1>Hospital services in Giginyu, Kano</h1>
          <p>
            Choose a service to see what it covers, how patients move through
            care, and how to contact MDS Hospital for the right next step.
          </p>
        </div>

        <div className="service-index-location">
          <FaHospital />
          <span>
            <strong>Open for coordinated care</strong>
            <small>
              Eastern Bypass, adjacent to Majiya and MYCA7 Filling Station,
              Giginyu, Kano.
            </small>
          </span>
          <FiMapPin />
        </div>
      </section>

      <section className="service-index-grid" aria-label="MDS Hospital services">
        {publicServices.map((service, index) => (
          <motion.article
            className="service-directory-card"
            key={service.slug}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.14 }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.18) }}
          >
            <img src={service.image} alt={service.imageAlt} loading="lazy" decoding="async" />
            <div>
              <span className="service-icon compact-service-icon">{service.icon}</span>
              <h2>{service.title}</h2>
              <p>{service.summary}</p>
              <Link to={`/services/${service.slug}`}>
                View service
                <FiArrowRight />
              </Link>
            </div>
          </motion.article>
        ))}
      </section>
    </main>
  );
}
