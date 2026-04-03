import React from 'react';

const TeamCard3D = ({ member }) => (
  <div style={{
    background: "rgba(24,28,36,0.92)",
    borderRadius: 18,
    boxShadow: "0 0 24px #00fff088, 0 8px 32px #0008",
    color: "#00fff0",
    fontFamily: "Montserrat, Arial, sans-serif",
    fontWeight: 500,
    fontSize: 17,
    padding: "32px 24px",
    textAlign: "center",
    border: "1.5px solid #00fff033",
    maxWidth: 260,
    minWidth: 220,
    flex: "0 0 auto",
    transform: "perspective(600px) rotateY(8deg) scale(1.04)",
    transition: "transform 0.2s"
  }}>
    <img src={member.img} alt={member.name} style={{
      width: 90, height: 90, borderRadius: "50%", border: "3px solid #00fff0", marginBottom: 16, objectFit: "cover", boxShadow: "0 0 16px #00fff088"
    }} />
    <div style={{ fontWeight: 700, color: "#fff", fontSize: 20, marginBottom: 4 }}>{member.name}</div>
    <div style={{ color: "#00fff0", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{member.title}</div>
    <div style={{ color: "#e0e6ed", fontWeight: 400, fontSize: 14 }}>{member.desc}</div>
  </div>
);

export default TeamCard3D;