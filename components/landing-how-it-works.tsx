import { motion } from "framer-motion"

export function LandingHowItWorks() {
  const steps = [
    {
      title: "Create Account",
      description: "Sign up in seconds with just your email. No credit card required to get started.",
    },
    {
      title: "Configure Workspace",
      description: "Customize your workspace to match your business needs.",
    },
    {
      title: "Boost Productivity",
      description: "Start using AI-powered pricing to streamline your operations and maximize revenue.",
    },
  ]

  return (
    <section className="w-full py-20" id="how-it-works">
      <div className="container mx-auto px-4 flex flex-col items-center">
        <span className="mb-4 px-4 py-1 rounded-full bg-muted/50 text-sm font-medium text-primary">How It Works</span>
        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4">Simple Process, Powerful Results</h2>
        <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl">
          Get started in minutes and see the difference our platform can make for your business.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, delay: i * 0.18, ease: "easeOut" }}
            >
              <motion.span
                className="w-16 h-16 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-2xl font-bold mb-6 shadow-md"
                initial={{ scale: 0.7, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: i * 0.18 + 0.1, type: "spring", stiffness: 180 }}
              >
                {(i + 1).toString().padStart(2, '0')}
              </motion.span>
              <h3 className="font-bold text-xl mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-base">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 