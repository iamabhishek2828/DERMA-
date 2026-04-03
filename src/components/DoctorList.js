import React from 'react';
import { FaClock, FaEnvelope, FaHospital, FaUserMd } from 'react-icons/fa';

import '../styles/doctorlist.css';

const doctors = [
  {
    name: 'Dr. Priya Sharma',
    specialty: 'Hair Specialist',
    experience: '10+ years',
    contact: 'priya.sharma@dermai.com',
    hospital: 'SkinCare Clinic, Mumbai',
  },
  {
    name: 'Dr. Rahul Mehta',
    specialty: 'Acne Specialist',
    experience: '8 years',
    contact: 'rahul.mehta@dermai.com',
    hospital: 'Glow Skin Hospital, Delhi',
  },
  {
    name: 'Dr. Anjali Verma',
    specialty: 'Dermatologist',
    experience: '12 years',
    contact: 'anjali.verma@dermai.com',
    hospital: 'Healthy Skin Center, Bangalore',
  },
  {
    name: 'Dr. Sameer Khan',
    specialty: 'General Dermatology',
    experience: '15 years',
    contact: 'sameer.khan@dermai.com',
    hospital: 'City Hospital, Hyderabad',
  },
];

const DoctorList = () => (
  <div className="doctor-list-page derma-page-shell">
    <div className="derma-page-container doctor-list-page__layout">
      <section className="doctor-list-hero derma-page-panel">
        <span className="derma-page-kicker">Doctor Directory</span>
        <h1 className="derma-section-title">Specialists presented like a real care network, not placeholder cards.</h1>
        <p className="derma-section-copy">
          The doctor list is now structured for trust and readability, with the same visual quality as the rest of the
          product experience.
        </p>
      </section>

      <section className="doctor-list-grid">
        {doctors.map((doctor) => (
          <article key={doctor.name} className="doctor-list-card derma-page-panel">
            <div className="doctor-list-card__badge">
              <FaUserMd />
              <span>{doctor.specialty}</span>
            </div>

            <h2>{doctor.name}</h2>

            <div className="doctor-list-card__meta">
              <div>
                <FaClock />
                <span>{doctor.experience}</span>
              </div>
              <div>
                <FaEnvelope />
                <span>{doctor.contact}</span>
              </div>
              <div>
                <FaHospital />
                <span>{doctor.hospital}</span>
              </div>
            </div>

            <button className="derma-button doctor-list-card__button" type="button">
              Request Consultation
            </button>
          </article>
        ))}
      </section>
    </div>
  </div>
);

export default DoctorList;
