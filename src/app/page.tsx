import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-white py-16 border-b border-gray-200">
        <div className="container">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Functional Foods
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-3xl mx-auto">
              Opskrifter til vægttab og en sund livsstil
            </p>
            <div className="space-x-4">
              <Link 
                href="/opskriftsoversigt" 
                className="btn-primary"
              >
                Se alle opskrifter
              </Link>
              <Link 
                href="/meal-planner" 
                className="btn-secondary"
              >
                Lav madplan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Hvorfor vælge Functional Foods?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Sunde opskrifter</h3>
              <p className="text-gray-600">
                Alle vores opskrifter er sunde og egner sig til vægttab og en sund livsstil.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🥗</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Nemme at lave</h3>
              <p className="text-gray-600">
                Vores opskrifter er nemme at lave og perfekte til hverdagen.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Gratis tilgængelige</h3>
              <p className="text-gray-600">
                Alle vores opskrifter er gratis og tilgængelige for alle.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
} 