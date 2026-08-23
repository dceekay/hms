import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiMapPin, FiPhoneCall } from "react-icons/fi";

import mdsLogo from "../assets/optimized/logo.png";
import { findPublicService, getRelatedServices } from "../data/publicServices";
import { applySeo, seoSiteUrl } from "../utils/seo";

import "../styles/landing.css";

const hospitalAddress =
  "Eastern Bypass, adjacent to Majiya and MYCA7 Filling Station, Giginyu, Kano 700213, Kano";
const emergencyDisplay = "0708 229 7430";
const emergencyTel = "tel:+2347082297430";
const whatsappUrl =
  "https://wa.me/2349137526952?text=Hello%20MDS%20Hospital%2C%20I%20would%20like%20to%20ask%20about%20a%20service.";
const googleMapsUrl =
  "https://www.google.com/maps/place/MDS+HOSPITAL/@11.9926965,8.5865612,17z/data=!3m1!4b1!4m6!3m5!1s0x11ae833f2e4d110f:0x916e22c7202b3a5!8m2!3d11.9926965!4d8.5865612!16s%2Fg%2F11hz_lk_v0";

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const service = findPublicService(slug);

  useEffect(() => {
    if (!service) {
      return;
    }

    applySeo({
      title: service.seoTitle,
      description: service.description,
      canonicalPath: `/services/${service.slug}`,
      keywords: service.keywords,
      imageAlt: service.imageAlt,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "MedicalBusiness",
        name: `MDS Hospital - ${service.title}`,
        url: `${seoSiteUrl}/services/${service.slug}`,
        image: `${seoSiteUrl}/mds-hospital-og.jpg`,
        telephone: "+2347082297430",
        description: service.description,
        address: {
          "@type": "PostalAddress",
          streetAddress:
            "Eastern Bypass, adjacent to Majiya and MYCA7 Filling Station, Giginyu",
          addressLocality: "Kano",
          addressRegion: "Kano",
          postalCode: "700213",
          addressCountry: "NG",
        },
        areaServed: ["Giginyu", "Kano", "Kano State", "Nigeria"],
        medicalSpecialty: service.title,
        makesOffer: {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service.title,
            description: service.summary,
          },
        },
        mainEntity: service.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    });
  }, [service]);

  if (!service) {
    return <Navigate to="/services" replace />;
  }

  const relatedServices = getRelatedServices(service);

  return (
    <main className="landing-page service-page">
      <header className="service-topbar">
        <Link to="/" className="landing-brand service-brand">
          <img src={mdsLogo} alt="MDS Hospital logo" decoding="async" />
          <span>
            <strong>MDS Hospital</strong>
            <small>Giginyu, Kano</small>
          </span>
        </Link>

        <nav className="service-topnav" aria-label="Service navigation">
          <Link to="/services">All services</Link>
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

      <nav className="service-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/services">Services</Link>
        <span>/</span>
        <strong>{service.shortTitle}</strong>
      </nav>

      <section className="service-detail-hero">
        <motion.div
          className="service-detail-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
        >
          <p className="eyebrow">MDS Hospital service</p>
          <h1>{service.title} in Kano</h1>
          <p>{service.description}</p>

          <div className="service-hero-actions">
            <a href={whatsappUrl} className="primary-btn" target="_blank" rel="noreferrer">
              Ask about this service
              <FiArrowRight />
            </a>
            <a href={emergencyTel} className="secondary-btn">
              Call {emergencyDisplay}
              <FiPhoneCall />
            </a>
          </div>
        </motion.div>

        <motion.figure
          className="service-detail-media"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.46, delay: 0.1 }}
        >
          <img
            src={service.image}
            alt={service.imageAlt}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <figcaption>
            <FiMapPin />
            {hospitalAddress}
          </figcaption>
        </motion.figure>
      </section>

      <section className="service-info-grid">
        <article>
          <p className="eyebrow">What we provide</p>
          <h2>Care that is clear from arrival to follow-up.</h2>
          <ul className="service-check-list">
            {service.offerings.map((item) => (
              <li key={item}>
                <FiCheckCircle />
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article>
          <p className="eyebrow">Why it helps</p>
          <h2>Built around patient movement inside the hospital.</h2>
          <ul className="service-check-list">
            {service.benefits.map((item) => (
              <li key={item}>
                <FiCheckCircle />
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="service-process-section">
        <div className="section-heading centered-heading">
          <p className="eyebrow">Patient pathway</p>
          <h2>How this service usually works</h2>
        </div>

        <div className="service-process-grid">
          {service.journey.map((step, index) => (
            <article key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="service-faq-section">
        <div>
          <p className="eyebrow">Quick answers</p>
          <h2>Questions patients often ask</h2>
        </div>

        <div className="service-faq-list">
          {service.faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {relatedServices.length > 0 && (
        <section className="related-services-section">
          <div className="section-heading">
            <p className="eyebrow">Related services</p>
            <h2>Patients also use these services</h2>
          </div>

          <div className="related-services-grid">
            {relatedServices.map((related) => (
              <Link to={`/services/${related.slug}`} key={related.slug}>
                <span className="service-icon compact-service-icon">{related.icon}</span>
                <strong>{related.title}</strong>
                <small>{related.summary}</small>
                <FiArrowRight />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="service-final-cta">
        <div>
          <p className="eyebrow">Visit MDS Hospital</p>
          <h2>Need help choosing the right service?</h2>
          <p>{hospitalAddress}</p>
        </div>

        <div>
          <a href={googleMapsUrl} className="secondary-btn" target="_blank" rel="noreferrer">
            Get directions
            <FiMapPin />
          </a>
          <Link to="/" className="primary-btn">
            <FiArrowLeft />
            Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}
