import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, BarChart3, Info } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Memorial Highway Database Project
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
          A comprehensive database of memorial highway designations across all 50 states
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/map">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Explore the Map
              </Button>
            </Link>
            <Link href="/findings">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-blue-800"
              >
                View Analysis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Explore the Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <MapPin className="w-12 h-12 text-blue-600 mb-4" />
                <CardTitle>Interactive Map</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Explore memorial highways on an interactive map. Filter by state, search
                  by honoree name, and discover the stories behind each designation.
                </p>
                <Link href="/map">
                  <Button variant="link" className="p-0">
                    View Map →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-blue-600 mb-4" />
                <CardTitle>Analysis & Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Examine demographic patterns, geographic distribution, and trends in
                  memorial highway designations across the United States.
                </p>
                <Link href="/findings">
                  <Button variant="link" className="p-0">
                    View Findings →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Info className="w-12 h-12 text-blue-600 mb-4" />
                <CardTitle>About the Project</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Learn about our mission to consolidate memorial highway data,
                  our methodology, and how you can contribute to this important work.
                </p>
                <Link href="/about">
                  <Button variant="link" className="p-0">
                    Learn More →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 ">
        <div className="container mx-auto px-4 text-center ">
          <h2 className="text-3xl font-bold mb-12">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8" >
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">1</div>
              <div className="text-gray-600">States</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">1033</div>
              <div className="text-gray-600">Memorial Highways</div>
            </div>
        

          </div>
        </div>
      </section>
    </div>
  )
}
