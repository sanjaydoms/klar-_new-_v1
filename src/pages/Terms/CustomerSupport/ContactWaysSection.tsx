import React, { useState, useRef, useEffect } from 'react';
import { PhoneCall, Sparkles, MessageCircle, Mail, ArrowUpRight } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface ContactOption {
  id: string;
  title: string;
  actionText: string;
  description: string;
  icon: React.ElementType;
  link?: string;
}

export default function ContactWaysSection() {
  const [selectedTab, setSelectedTab] = useState<string>('ai-chat');

  // AI Chat States
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

  const handleOpenAiChat = () => {
    if (messages.length === 0) {
      const initialGreeting: Message = {
        id: Date.now().toString(),
        sender: 'bot',
        text: 'Hello! Welcome to Klar Travels AI Chat. How can I assist you today?',
        timestamp: getCurrentTime(),
      };
      setMessages([initialGreeting]);
    }
    setIsChatOpen(true);
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
        'At Klar Travels, we offer a comprehensive suite of travel services:\n\n' +
        '• Flight & Hotel Reservations\n' +
        '• Express Visa Application & Tracking\n' +
        '• B2B & Corporate Travel Management\n' +
        '• Customized Tour Packages & Itineraries\n' +
        '• Travel Insurance & Legal Dossiers\n' +
        '• 24/7 In-Transit Emergency Support\n\n' +
        'Which of these services would you like to know more about?'
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
      return 'Alright! Have a wonderful trip ahead. Feel free to drop a message anytime if you need assistance!';
    }

    if (text.match(/\b(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/)) {
      return 'Hello! Welcome to Klar Travels Support. How can I assist you with your journey today?';
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
      return 'I can help with flight seat selection, baggage upgrades, hotel check-in details, or itinerary changes. Please share your 6-character booking reference code to proceed.';
    }

    if (
      text.includes('refund') ||
      text.includes('cancel') ||
      text.includes('payment') ||
      text.includes('billing') ||
      text.includes('money')
    ) {
      return 'For cancellations within 24 hours of booking, a 90% refund is processed automatically. For older bookings, refund timelines depend on airline/hotel policy (typically 3-5 business days).';
    }

    if (
      text.includes('human') ||
      text.includes('agent') ||
      text.includes('representative') ||
      text.includes('call') ||
      text.includes('phone') ||
      text.includes('person')
    ) {
      return 'You can connect directly with our human support specialists at +91 8099359377 (Mon - Sat, 9 AM - 8 PM IST) or via email at info.klarworld@gmail.com.';
    }

    return `I received your query about "${input}". To give you the most accurate help, please pick a topic:\n\n1. Services List\n2. Visa Support\n3. Flight & Hotel Bookings\n4. Refund & Cancellation\n5. Talk to Support Executive`;
  };

  const rightTabs: ContactOption[] = [
    {
      id: 'ai-chat',
      title: 'AI Travel Chat',
      actionText: 'Ask Klar AI anything',
      description: 'Instant answers on bookings, refunds & visas',
      icon: Sparkles,
      link: '#',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Support',
      actionText: '+91 8099359377',
      description: 'Send booking ID to start',
      icon: MessageCircle,
      link: 'https://wa.me/918099359377',
    },
    {
      id: 'email',
      title: 'Email Support',
      actionText: 'care@klartravels.com',
      description: 'Replies within 4 hours',
      icon: Mail,
      link: 'mailto:care@klartravels.com',
    },
  ];

  const handleTabClick = (tab: ContactOption) => {
    setSelectedTab(tab.id);
    if (tab.id === 'ai-chat') {
      handleOpenAiChat();
    }
  };

  return (
    <section className="w-full bg-[#FDF5F1] py-16">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        {/* Header Badge & Title */}
        <div className="mb-10 text-left">
          <span
            className="inline-block px-3 py-1 mb-4 text-xs font-semibold rounded-full"
            style={{ backgroundColor: '#F9EBE5', color: '#4E0004' }}
          >
            ✦ Instant support
          </span>
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-3" style={{ color: '#16255F' }}>
            Ways to contact our support team
          </h2>
          <p className="text-sm md:text-base" style={{ color: '#7B6A64' }}>
            Four ways in — every one of them staffed around the clock, including public holidays.
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Maroon Card */}
          <div
            className="lg:col-span-5 relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-white shadow-lg min-h-[360px]"
            style={{ backgroundColor: '#3B0D0F' }}
          >
            <div className="absolute inset-0 z-0 pointer-events-none">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full border border-yellow-700/30" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full border border-yellow-700/20" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <span className="inline-block px-3 py-1 text-xs rounded-full bg-[#3D1417] text-[#D89B1D] font-medium border border-white/10 mb-6">
                  Fastest response
                </span>

                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                    <PhoneCall className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-gray-300 font-medium mb-1">
                    Call Us
                  </p>
                  <a
                    href="tel:+918099359377"
                    className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white hover:underline block"
                  >
                    +91 8099359377
                  </a>
                </div>
              </div>

              <div className="pt-6 border-t border-white/15 flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-300">
                  Answered in under 2 min
                </span>
                <a
                  href="tel:+918099359377"
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#2C0A0C] hover:bg-gray-100 transition-transform hover:scale-105"
                >
                  <ArrowUpRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Interactive Tabs */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {rightTabs.map((tab) => {
              const isSelected = selectedTab === tab.id;
              const IconComponent = tab.icon;

              return (
                <div
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`relative flex items-center justify-between p-5 sm:p-6 rounded-2xl cursor-pointer transition-all duration-200 border ${
                    isSelected ? 'border-[#D9A18B] shadow-sm' : 'border-white/60 bg-white hover:border-gray-200'
                  }`}
                  style={{ backgroundColor: isSelected ? '#FAEBE4' : '#FFFFFF' }}
                >
                  {isSelected && (
                    <div
                      className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-md"
                      style={{ backgroundColor: '#4E0004' }}
                    />
                  )}

                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FDF5F1' }}>
                      <IconComponent className="w-6 h-6" style={{ color: '#4E0004' }} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-serif font-bold text-base sm:text-lg" style={{ color: '#16255F' }}>
                          {tab.title}
                        </h3>
                        <span className="text-xs sm:text-sm font-normal" style={{ color: '#7B6A64' }}>
                          {tab.actionText}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#7B6A64' }}>
                        {tab.description}
                      </p>
                    </div>
                  </div>

                  <a
                    href={tab.link || '#'}
                    onClick={(e) => {
                      if (tab.id === 'ai-chat') {
                        e.preventDefault();
                        handleOpenAiChat();
                      } else if (!tab.link || tab.link === '#') {
                        e.preventDefault();
                      }
                    }}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <ArrowUpRight className="w-5 h-5" style={{ color: '#16255F' }} />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Chatbot Drawer Overlay */}
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
}