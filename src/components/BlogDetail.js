import React from 'react';
import { useParams } from 'react-router-dom';

const blogData = {
  "summer-skin-care": {
    title: "🌞 Summer Skin Care: Top 5 Tips",
    content: [
      "1. **Use Broad-Spectrum Sunscreen:** Protect your skin from UVA and UVB rays. Reapply every 2 hours.",
      "2. **Stay Hydrated:** Drink plenty of water to keep your skin plump and healthy.",
      "3. **Wear Protective Clothing:** Hats, sunglasses, and long sleeves help shield your skin.",
      "4. **Cleanse Gently:** Sweat and sunscreen can clog pores. Use a gentle cleanser twice daily.",
      "5. **Eat Skin-Friendly Foods:** Include fruits and veggies rich in antioxidants.",
      "AI tip: Did you know watermelon is not only hydrating but also rich in lycopene, which helps protect your skin from sun damage?"
    ],
    images: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80"
    ]
  },
  "ai-in-dermatology": {
    title: "🤖 How AI is Changing Dermatology",
    content: [
      "AI is revolutionizing dermatology by enabling instant skin analysis, early detection of conditions, and personalized care.",
      "DermAi uses advanced neural networks to analyze images and provide probable diagnoses in seconds.",
      "Doctors can use AI as a second opinion, improving accuracy and patient outcomes.",
      "AI insight: AI can also help track treatment progress over time, making it easier to adjust routines for better results."
    ],
    images: [
      "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80"
    ]
  },
  "skin-nutrition": {
    title: "🍏 Foods for Healthy Skin",
    content: [
      "A balanced diet is key for glowing skin. Include foods rich in vitamins A, C, and E.",
      "Omega-3 fatty acids (found in walnuts and flaxseeds) help reduce inflammation.",
      "Probiotics (like yogurt) support your skin's barrier.",
      "AI tip: Green tea is packed with antioxidants that help fight acne and aging."
    ],
    images: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80"
    ]
  }
};

const BlogDetail = () => {
  const { slug } = useParams();
  const blog = blogData[slug];

  if (!blog) {
    return <div style={{ color: "#185a9d", padding: 40 }}>Blog not found.</div>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(120deg, #e3f0fa 60%, #fff 100%)",
        color: "#185a9d",
        paddingBottom: 80,
        paddingTop: 60,
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          background: "rgba(255,255,255,0.98)",
          borderRadius: 28,
          boxShadow: "0 8px 48px #00d2ff22, 0 2px 16px #b5d0e6",
          border: "2px solid #e3f0fa",
          padding: "40px 28px 32px 28px",
          marginTop: 40,
          fontFamily: "Montserrat, Arial, sans-serif",
        }}
      >
        <h1
          style={{
            color: "#3a7bd5",
            fontWeight: 900,
            fontSize: 36,
            marginBottom: 18,
            letterSpacing: 1,
            textAlign: "center",
            textShadow: "0 2px 24px #b5d0e6",
          }}
        >
          {blog.title}
        </h1>
        {blog.images && (
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 24, justifyContent: "center" }}>
            {blog.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                style={{
                  width: "calc(50% - 9px)",
                  minWidth: 180,
                  borderRadius: 14,
                  boxShadow: "0 2px 12px #00b4d844",
                  objectFit: "cover",
                  maxHeight: 220,
                }}
              />
            ))}
          </div>
        )}
        <div>
          {blog.content.map((line, idx) => (
            <p
              key={idx}
              style={{
                fontSize: 18,
                marginBottom: 18,
                lineHeight: 1.7,
                color: line.toLowerCase().includes("ai tip") || line.toLowerCase().includes("ai insight")
                  ? "#00b4d8"
                  : "#185a9d",
                fontStyle: line.toLowerCase().includes("ai tip") || line.toLowerCase().includes("ai insight")
                  ? "italic"
                  : "normal",
                fontWeight: line.toLowerCase().includes("ai tip") || line.toLowerCase().includes("ai insight")
                  ? 600
                  : 500,
              }}
              dangerouslySetInnerHTML={{
                __html: line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>"),
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;