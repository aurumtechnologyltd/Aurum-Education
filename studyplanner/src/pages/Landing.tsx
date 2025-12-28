import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Sparkles, MessageSquare, ArrowRight } from 'lucide-react'

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
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
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
          <div className="relative">
            <img
              src="/AurumEducationImages/generated-image (1).png"
              alt="Student transformation"
              className="rounded-lg shadow-2xl"
            />
          </div>
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
          <div className="text-center mb-12">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div>
                <div className="text-4xl font-bold text-[#D4AF37] mb-2">500+</div>
                <div className="text-muted-foreground">Students</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[#D4AF37] mb-2">10,000+</div>
                <div className="text-muted-foreground">Study Plans</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[#D4AF37] mb-2">95%</div>
                <div className="text-muted-foreground">Success Rate</div>
              </div>
            </div>
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
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Twitter</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 Aurum Education. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

