export default function Profile() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">個人頁面</h1>
      <p className="text-gray-600 mb-8">
        管理您發布的 Convention、已安裝的模組與活動記錄。
      </p>

      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <p className="text-gray-500 mb-4">
          請先登入以使用個人頁面功能。
        </p>
        <button className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900 transition">
          Login with GitHub
        </button>
      </div>
    </div>
  )
}
