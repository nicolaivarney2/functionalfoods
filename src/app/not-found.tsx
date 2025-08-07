export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-xl text-gray-600 mb-4">Siden blev ikke fundet</h2>
        <p className="text-gray-500 mb-8">
          Beklager, men siden du leder efter eksisterer ikke.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Gå tilbage til forsiden
        </a>
      </div>
    </div>
  )
} 