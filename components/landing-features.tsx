import { FiZap, FiBarChart2, FiUsers, FiShield, FiLayers, FiRefreshCw } from "react-icons/fi"

const features = [
  {
    icon: <FiZap size={24} className="text-zinc-800 dark:text-white" />, // AI Price Optimization
    title: "AI Price Optimization",
    description: "Automatically set the best prices for your products using real-time market data and machine learning.",
  },
  {
    icon: <FiRefreshCw size={24} className="text-zinc-800 dark:text-white" />, // Competitor Monitoring
    title: "Competitor Monitoring",
    description: "Track competitor prices and adjust your strategy instantly.",
  },
  {
    icon: <FiBarChart2 size={24} className="text-zinc-800 dark:text-white" />, // Revenue Analytics
    title: "Revenue Analytics",
    description: "Visualize your sales and pricing performance with powerful analytics.",
  },
  {
    icon: <FiLayers size={24} className="text-zinc-800 dark:text-white" />, // Bulk Price Updates
    title: "Bulk Price Updates",
    description: "Update prices across your catalog in seconds.",
  },
  {
    icon: <FiUsers size={24} className="text-zinc-800 dark:text-white" />, // API & Integrations
    title: "API & Integrations",
    description: "Connect DriftPrice with your favorite e-commerce platforms and tools.",
  },
  {
    icon: <FiShield size={24} className="text-zinc-800 dark:text-white" />, // Enterprise Security
    title: "Enterprise Security",
    description: "Your data is protected with industry-leading security and compliance.",
  },
]

export function LandingFeatures() {
  return (
    <section className="w-full py-16" id="features">
      <div className="container mx-auto px-4 flex flex-col items-center">
        <span className="mb-4 px-4 py-1 rounded-full bg-muted/50 text-sm font-medium text-primary">Features</span>
        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4">Everything You Need to Succeed</h2>
        <p className="text-lg text-muted-foreground text-center mb-8 max-w-2xl">
          Our AI-powered platform provides all the tools you need to optimize pricing, boost sales, and stay ahead of the market.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
          {features.map((feature, i) => (
            <div
              key={i}
              className="relative rounded-2xl border border-white/10 bg-white/90 dark:bg-zinc-800/90 p-8 flex flex-col items-start shadow-md transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] group overflow-hidden"
            >
              <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-700 shadow-inner relative z-10 group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="font-bold text-lg mb-2 relative z-10">{feature.title}</h3>
              <p className="text-muted-foreground text-sm relative z-10">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
} 