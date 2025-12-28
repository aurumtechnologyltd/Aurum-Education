import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, Linkedin, Twitter, Instagram } from 'lucide-react'

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Aurum Education" className="w-8 h-8" />
              <span className="font-bold text-xl">Aurum Education</span>
            </Link>
            <div className="flex gap-4">
              <Link to="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-[#D4AF37] hover:bg-[#D4AF37]/90">Start Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            About
            <br />
            <span className="text-[#D4AF37]">Aurum Education</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Empowering students to achieve academic excellence through AI-powered planning
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-6">
              At Aurum Education, we believe that every student deserves the tools to succeed academically. 
              We're on a mission to transform the way students plan, organize, and excel in their studies.
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              By leveraging the power of artificial intelligence, we help students go from chaos to crystal clear 
              organization, ensuring they never miss a deadline and always stay on track with their academic goals.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Values</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-[#D4AF37]">Innovation</h3>
              <p className="text-muted-foreground">
                We continuously push the boundaries of what's possible with AI to create the best tools for students.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-[#D4AF37]">Accessibility</h3>
              <p className="text-muted-foreground">
                Education should be accessible to everyone. We offer a free tier and affordable pricing to ensure 
                all students can benefit from our platform.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-[#D4AF37]">Student Success</h3>
              <p className="text-muted-foreground">
                Everything we build is designed with one goal in mind: helping students succeed academically and 
                reduce stress in their academic journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Parent Company Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">A Product of Aurum Technology Limited</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Aurum Education is part of the Aurum Technology Limited family, dedicated to creating innovative 
              solutions that make a difference.
            </p>
            <a
              href="https://aurumtechnologyltd.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg">
                Visit Parent Company
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Join Us on This Journey</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Ready to transform your academic planning? Get started today.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-[#D4AF37] hover:bg-[#D4AF37]/90">
              Start Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Aurum Education" className="w-8 h-8" />
                <span className="font-bold">Aurum Education</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered semester planning made simple.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
                <li><Link to="/features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://aurumtechnologyltd.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Aurum Technology Limited
                    <span className="text-xs ml-1">(Parent Company)</span>
                  </a>
                </li>
                <li><Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Social</h3>
              <div className="flex gap-4">
                <a
                  href="https://www.linkedin.com/company/aururm-technology-limited"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="https://x.com/aurumtechnology"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://www.instagram.com/aurumtechnologyltd/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 Aurum Education. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

