import React, { useState } from 'react';

/* ── Static Contact Data ── */
const contactDetails = {
  heading: 'Contact us :',
  mainPhone: '+91 8099359377',
  sections: [
    {
      title: 'APAC Head Office',
      content: ['Mon – Fri: 9am – 6pm AEST', 'Sat: 9am – 1pm AEST'],
    },
    {
      title: 'Office Visiting Hours',
      content: ['Mon – Fri: 9am – 6pm AEST by appointment'],
    },
    {
      title: 'Address',
      content: ['ABIDS', 'Hyderabad, Telangana St, INDIA'],
    },
  ],
};

const ContactSection: React.FC = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    destination: '',
    email: '',
    message: '',
  });

  return (
    <section className="w-full flex flex-col items-center" style={{ paddingTop: "48px", paddingBottom: "60px" }}>
      {/* Inner wrapper — centered, max-width matches Figma 1052px content */}
      <div style={{ width: "100%", maxWidth: "1052px", paddingLeft: "20px", paddingRight: "20px" }}>

        {/* ── Row 1: Image + Contact Details ── */}
        <div className="flex flex-col lg:flex-row" style={{ gap: "40px", marginBottom: "48px" }}>

          {/* Left Image */}
          <div
            style={{
              width: "100%",
              maxWidth: "521px",
              height: "auto",
              maxHeight: "679px",
              borderRadius: "25px",
              overflow: "hidden",
              flexShrink: 0,
              aspectRatio: "521/679",
            }}
            className="mx-auto lg:mx-0"
          >
            <img
              src="/Contact-US/Contact-Left.jpg"
              alt="Contact"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Right Contact Details */}
          <div
            className="flex flex-col justify-center text-center lg:text-left"
            style={{ flex: 1, gap: "10.76px" }}
          >
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px, 5vw, 36px)",
                color: "#0D0D2B",
                margin: "0 0 4px 0",
                lineHeight: 1.2,
              }}
            >
              {contactDetails.heading}
            </h2>

            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(22px, 4vw, 28px)",
                color: "#0D0D2B",
                margin: "0 0 16px 0",
                lineHeight: 1.2,
              }}
            >
              <a
                href={`tel:${contactDetails.mainPhone.replace(/\s/g, '')}`}
                style={{ textDecoration: "none", color: "#0D0D2B" }}
                className="hover:text-[#1F2A6B] transition-colors"
              >
                {contactDetails.mainPhone}
              </a>
            </p>

            {contactDetails.sections.map((item) => (
              <div key={item.title} style={{ marginBottom: "8px" }}>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(14px, 2vw, 15px)",
                    color: "#0D0D2B",
                    margin: "0 0 3px 0",
                  }}
                >
                  {item.title}
                </p>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: "clamp(13px, 1.8vw, 14px)",
                    color: "#57534D",
                    margin: 0,
                    lineHeight: 1.8,
                  }}
                >
                  {item.content.map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
              </div>
            ))}

            {/* ── Mobile Quick Actions ── */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:hidden">
              <a
                href={`tel:${contactDetails.mainPhone.replace(/\s/g, '')}`}
                className="w-full sm:w-auto px-6 py-3 bg-[#1F2A6B] text-white text-sm font-bold rounded-xl text-center hover:bg-[#162055] transition-colors"
              >
                📞 Call Now
              </a>
              <a
                href="mailto:support@klartravel.com"
                className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl text-center hover:bg-gray-200 transition-colors"
              >
                ✉️ Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
