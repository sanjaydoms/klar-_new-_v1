import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

const SupportHeroSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen, isTyping]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleBrowseHelp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const queryText = searchQuery.trim();
    if (!queryText) return;

    const initialUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      timestamp: getCurrentTime(),
    };

    setMessages([initialUserMsg]);
    setIsChatOpen(true);
    setIsTyping(true);

    setTimeout(() => {
      const initialReply = generateBotReply(queryText);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: initialReply,
        timestamp: getCurrentTime(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: getCurrentTime(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botReplyText = generateBotReply(userText);
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botReplyText,
        timestamp: getCurrentTime(),
      };
      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 900);
  };

  const generateBotReply = (input: string): string => {
    const text = input.toLowerCase().trim();

    if (
      text.includes('service') ||
      text.includes('provide') ||
      text.includes('offer') ||
      text.includes('what do you do') ||
      text.includes('what can you do')
    ) {
      return (
        "At Klar Travels, we offer a comprehensive suite of travel services:\n\n" +
        "• Flight & Hotel Reservations\n" +
        "• Express Visa Application & Tracking\n" +
        "• B2B & Corporate Travel Management\n" +
        "• Customized Tour Packages & Itineraries\n" +
        "• Travel Insurance & Legal Dossiers\n" +
        "• 24/7 In-Transit Emergency Support\n\n" +
        "Which of these services would you like to know more about?"
      );
    }

    if (
      text === 'yes' ||
      text === 'yeah' ||
      text === 'sure' ||
      text === 'ok' ||
      text === 'okay' ||
      text.includes('yes please')
    ) {
      return "Great! Please let me know what specific detail or booking you'd like to check (e.g., 'Check Visa Status', 'Flight Modification', or 'Speak to Agent').";
    }

    if (
      text === 'no' ||
      text === 'nope' ||
      text.includes('no thanks') ||
      text.includes('that is all') ||
      text.includes('nothing')
    ) {
      return "Alright! Have a wonderful trip ahead. Feel free to drop a message anytime if you need assistance!";
    }

    if (text.match(/\b(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/)) {
      return "Hello! Welcome to Klar Travels Support. How can I assist you with your journey today?";
    }

    if (text.includes('visa') || text.includes('passport') || text.includes('permit')) {
      return "For visa services, we handle tourist, business, and express visas. You can track your ongoing application status under 'My Visas' in your profile or provide your application reference ID here.";
    }

    if (
      text.includes('flight') ||
      text.includes('hotel') ||
      text.includes('booking') ||
      text.includes('resort') ||
      text.includes('ticket')
    ) {
      return "I can help with flight seat selection, baggage upgrades, hotel check-in details, or itinerary changes. Please share your 6-character booking reference code to proceed.";
    }

    if (
      text.includes('refund') ||
      text.includes('cancel') ||
      text.includes('payment') ||
      text.includes('billing') ||
      text.includes('money')
    ) {
      return "For cancellations within 24 hours of booking, a 90% refund is processed automatically. For older bookings, refund timelines depend on airline/hotel policy (typically 3-5 business days).";
    }

    if (
      text.includes('human') ||
      text.includes('agent') ||
      text.includes('representative') ||
      text.includes('call') ||
      text.includes('phone') ||
      text.includes('person')
    ) {
      return "You can connect directly with our human support specialists at +91 8099359377 (Mon - Sat, 9 AM - 8 PM IST) or via email at info.klarworld@gmail.com.";
    }

    return `I received your query about "${input}". To give you the most accurate help, please pick a topic:\n\n1. Services List\n2. Visa Support\n3. Flight & Hotel Bookings\n4. Refund & Cancellation\n5. Talk to Support Executive`;
  };

  return (
    <section className="relative w-full bg-[#FAF5EF] py-12 md:py-20 lg:py-24 overflow-hidden border-b border-gray-100">
      {/* Background Image Layer (Fixed path & increased opacity) */}
      <div 
        className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-35 pointer-events-none" 
        style={{
          backgroundImage: `url('/images/SupportHeroSection_banner_img.jpg')`,
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center z-10">
        <div className="inline-flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#EAE4DA] shadow-xs mb-6">
          <span className="text-[#B68D40] text-xs sm:text-sm">✤</span>
          <span className="text-xs sm:text-sm font-[Playfair Display] italic font-medium text-[#5C4D3C]">
            Premium travel experiences since 2000
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold font-[Playfair Display] tracking-tight mb-3">
          <span className="text-[#16255F] mr-2 sm:mr-3">24/7</span>
          <span className="text-[#6B1518]">Customer Support</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-[#6B5E54] font-[Playfair Display] max-w-2xl mb-8">
          We're here before, during and after your journey.
        </p>

        <form
          onSubmit={handleBrowseHelp}
          className="w-full max-w-2xl bg-white rounded-xl p-2 pl-4 sm:pl-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#EAE4DA] flex items-center justify-between transition-all focus-within:shadow-[0_10px_35px_rgba(61,12,16,0.12)] focus-within:border-[#3D0C10]"
        >
          <div className="flex items-center flex-1 mr-2">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-2 sm:mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your question..."
              className="w-full text-xs sm:text-sm md:text-base text-[#1A1F4D] placeholder-gray-400 bg-transparent focus:outline-none font-sans rounded-xl transition-colors"
            />
          </div>

          <button
            type="submit"
            className="bg-[#6B1518] hover:bg-[#581218] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center space-x-2 transition-all duration-200 active:scale-95 shadow-md flex-shrink-0 cursor-pointer"
          >
            <span>Browse help</span>
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </form>
      </div>

      {/* AI Chatbot Drawer */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="absolute inset-0" onClick={() => setIsChatOpen(false)} />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Chat Header */}
              <div className="bg-[#3D0C10] text-white px-5 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#B68D40] flex items-center justify-center font-bold text-white text-sm shadow-inner">
                    ✤
                  </div>
                  <div>
                    <h3 className="font-[Playfair Display] font-bold text-base leading-tight">
                      Klar AI Support
                    </h3>
                    <p className="text-xs text-amber-100/80 font-sans flex items-center mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                      Active • 24/7 Virtual Assistant
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Close Chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Chat Log */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FAF8F5]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs sm:text-sm ${
                        msg.sender === 'user'
                          ? 'bg-[#3D0C10] text-white rounded-br-none shadow-xs'
                          : 'bg-white text-[#1A1F4D] rounded-bl-none border border-[#EAE4DA] shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center space-x-1.5 bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-[#EAE4DA] w-fit">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Form */}
              <form
                onSubmit={handleSendChatMessage}
                className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask follow up questions..."
                  className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-xs sm:text-sm text-[#1A1F4D] focus:outline-none focus:border-[#3D0C10] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-[#3D0C10] disabled:opacity-40 hover:bg-[#581218] text-white p-2.5 rounded-full transition-all duration-200 cursor-pointer"
                >
                  <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SupportHeroSection;