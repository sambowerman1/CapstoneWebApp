import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">About This Project</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mission</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <p className="text-gray-700 mb-4">
            The Memorial Highways project aims to consolidate and analyze memorial highway
            data from across the United States. Currently, no comprehensive national database
            exists—each state maintains its own records independently.
          </p>
          <p className="text-gray-700">
          By bringing this data together in one accessible location, we can better understand patterns in memorial designations, honor the many individuals and communities being remembered, and provide researchers with valuable demographic and geographic insights into who is memorialized—and why.
          </p>
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>The Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Noah Barnes", github: "nbarnes4" },
              { name: "Sam Bowerman", github: "sambowerman1" },
              { name: "Lucas Koch", github: "deltalucas" },
              { name: "Dhyana Patel", github: "Dbshort02" },
            ].map((member) => (
              <div key={member.github} className="text-center flex flex-col items-center">
                <p className="font-semibold text-gray-900 mb-2">{member.name}</p>
                <Image
                  src={`https://github.com/${member.github}.png`}
                  alt={`${member.name}'s profile`}
                  width={80}
                  height={80}
                  className="rounded-full mb-2 border-2 border-gray-200"
                  unoptimized
                />
                <a
                  href={`https://github.com/${member.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-900 transition-colors bg-gray-100 px-2 py-0.5 rounded"
                  style={{ fontFamily: "'Fira Code', 'SF Mono', 'Consolas', monospace" }}
                >
                  @{member.github}
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Methodology</CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mt-4 mb-2">Data Collection</h3>
          <p className="text-gray-700 mb-3">
            Data was collected from state Department of Transportation websites, legislative
            records, ODMP Database, Wikipedia, and ArcGIS databases. Each entry includes:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-6">
            <li>Highway identification (name, location, ShapeID from ArcGIS)</li>
            <li>Honoree information (name, military branch, rank)</li>
            <li>Designation details (year, legislation)</li>
            <li>Geographic data (coordinates, county, state)</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Analysis</h3>
          <p className="text-gray-700 mb-3">
            The analysis focuses on demographic patterns such as:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Distribution by military branch</li>
            <li>Geographic concentration by state and region</li>
            <li>Temporal trends in designations</li>
            
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Technology</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-3">This application is built with:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>
              <strong>Next.js 14</strong> with TypeScript for a modern, performant web framework
            </li>
            <li>
              <strong>Leaflet & esri-leaflet</strong> for interactive mapping with ArcGIS data support
            </li>
            <li>
              <strong>shadcn/ui</strong> for accessible, customizable UI components
            </li>
            <li>
              <strong>TanStack Table</strong> for powerful data table functionality
            </li>
            <li>
              <strong>Vercel</strong> for deployment and hosting
            </li>
          </ul>
        </CardContent>
      </Card>

     

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Contributing</h2>
        <p className="text-gray-700">
          This is an ongoing project. If you have information about memorial highways not
          included in our database, or corrections to existing entries, please contact the project team.
        </p>
      </div>
    </div>
  )
}
