export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-2">Memorial Highways</h3>
            <p className="text-sm text-gray-600">
              A comprehensive database of memorial highways honoring America's heroes across all 50 states.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Quick Links</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="/about" className="text-gray-600 hover:text-primary transition">
                  About the Project
                </a>
              </li>
              <li>
                <a href="/map" className="text-gray-600 hover:text-primary transition">
                  Interactive Map
                </a>
              </li>
              <li>
                <a href="/findings" className="text-gray-600 hover:text-primary transition">
                  Research Findings
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Contact</h4>
            <p className="text-sm text-gray-600">
              For questions or to contribute data, please contact your project team.
            </p>
          </div>
        </div>
        <div className="border-t mt-8 pt-4 text-center text-sm text-gray-600">
          <p>&copy; {currentYear} Memorial Highways Database. Capstone Project.</p>
        </div>
      </div>
    </footer>
  )
}
