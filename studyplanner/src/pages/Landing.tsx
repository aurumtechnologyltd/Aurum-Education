import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Sparkles, MessageSquare, ArrowRight, Linkedin, Twitter, Instagram } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Aurum Education" className="w-8 h-8" />
              <span className="font-bold text-xl">Aurum Education</span>
            </div>
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
            From Chaos to<br />
            <span className="text-[#D4AF37]">Crystal Clear</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your Semester, Perfectly Organized
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white">
              Start Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload Syllabus</h3>
                <p className="text-muted-foreground">
                  Simply upload your course syllabus and let AI extract all assignments, deadlines, and important information automatically.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Study Plan</h3>
                <p className="text-muted-foreground">
                  Get personalized, hour-by-hour study plans tailored to your schedule, priorities, and learning style.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Chat Your Questions</h3>
                <p className="text-muted-foreground">
                  Ask questions about your syllabus and course materials. Get instant, accurate answers powered by AI.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload</h3>
            <p className="text-muted-foreground">
              Upload your course syllabus and let our AI extract all the important details.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Analyzes</h3>
            <p className="text-muted-foreground">
              Our AI processes your syllabus and creates a comprehensive study plan tailored to you.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Study & Succeed</h3>
            <p className="text-muted-foreground">
              Follow your personalized plan, track progress, and achieve your academic goals.
            </p>
          </div>
        </div>
        <div className="mt-12 flex justify-center">
          <img
            src="/AurumEducationImages/generated-image (6).png"
            alt="Study plan visualization"
            className="rounded-lg shadow-lg max-w-2xl"
          />
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-[#D4AF37] mb-4">Coming Soon</h2>
            <p className="text-xl text-muted-foreground">
              We're building something amazing. Stay tuned!
            </p>
          </div>
        </div>
      </section>

      {/* Transform Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <img
              src="/AurumEducationImages/generated-image (4).png"
              alt="Student with app"
              className="rounded-lg shadow-2xl"
            />
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-6">Transform Your Academic Journey</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Join thousands of students who have transformed their semester planning with Aurum Education. 
              From overwhelmed to organized, from stressed to successful.
            </p>
            <Link to="/signup">
              <Button size="lg" className="bg-[#D4AF37] hover:bg-[#D4AF37]/90">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Referral Teaser */}
      <section className="bg-gradient-to-r from-emerald-500 to-[#D4AF37] py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center text-white">
            <div>
              <img
                src="/AurumEducationImages/generated-image (2).png"
                alt="Referral program"
                className="rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-4xl font-bold mb-4">Refer a Friend, Earn 100 Credits</h2>
              <p className="text-lg mb-6 opacity-90">
                Share Aurum Education with your friends and you both get rewarded. 
                When they sign up with your code and upload their first syllabus, you both receive 100 credits!
              </p>
              <Link to="/pricing">
                <Button size="lg" variant="secondary">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
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
                <li><Link to="/" className="text-muted-foreground hover:text-foreground">Features</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-muted-foreground hover:text-foreground">About</Link></li>
                <li><Link to="/" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
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
                <a
                  href="https://www.tiktok.com/@aurumtechnolgyltd?is_from_webapp=1&sender_device=pc"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
                <a
                  href="https://www.reddit.com/user/aurumtechnologyltd/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Reddit"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                  </svg>
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

