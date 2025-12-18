'use client'

import { useState, useEffect } from 'react'

export default function DeviceAuthPage() {
  const [deviceCode, setDeviceCode] = useState<any>(null)
  const [polling, setPolling] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const startDeviceFlow = async () => {
    try {
      setError(null)
      console.log('Starting device flow...')
      
      const response = await fetch('/api/auth/microsoft/device')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error:', response.status, errorText)
        setError(`API Error: ${response.status} - ${errorText}`)
        return
      }
      
      const data = await response.json()
      console.log('Device code received:', data)
      
      if (data.error) {
        console.error('Error in response:', data.error)
        setError(data.error + (data.details ? ` - ${data.details}` : ''))
        return
      }

      setDeviceCode(data)
      setPolling(true)
      setError(null)
    } catch (err: any) {
      console.error('Exception:', err)
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  useEffect(() => {
    if (!deviceCode || !polling) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/microsoft/device/poll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ device_code: deviceCode.device_code }),
        })

        const data = await response.json()

        if (data.success) {
          setResult(data)
          setPolling(false)
          clearInterval(pollInterval)
        } else if (!data.pending) {
          setError(data.error || 'Authorization failed')
          setPolling(false)
          clearInterval(pollInterval)
        }
      } catch (err: any) {
        setError(err.message)
        setPolling(false)
        clearInterval(pollInterval)
      }
    }, (deviceCode.interval || 5) * 1000)

    return () => clearInterval(pollInterval)
  }, [deviceCode, polling])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-slate-900 dark:text-slate-100">
          Outlook Calendar Authentication
        </h1>

        {!deviceCode && !result && (
          <div className="text-center">
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              Device Code Flow kullanarak Outlook takviminize erişim sağlayın.
              Bu yöntem bazen admin consent gerektirmez.
            </p>
            <button
              onClick={(e) => {
                e.preventDefault()
                console.log('Button clicked!')
                startDeviceFlow()
              }}
              type="button"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={!!deviceCode || !!result}
            >
              Start Authentication
            </button>
          </div>
        )}

        {deviceCode && !result && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                Adımlar:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
                <li>Aşağıdaki kodu kopyalayın</li>
                <li>
                  <a
                    href={deviceCode.verification_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline"
                  >
                    Bu linke
                  </a>{' '}
                  tıklayın ve kodu girin
                </li>
                <li>İzinleri onaylayın</li>
              </ol>
            </div>

            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Kod:
              </p>
              <p className="text-3xl font-mono font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                {deviceCode.user_code}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(deviceCode.user_code)
                  alert('Kod kopyalandı!')
                }}
                className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-500"
              >
                Kodu Kopyala
              </button>
            </div>

            <div className="text-center">
              <a
                href={deviceCode.verification_uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Microsoft'a Git ve Kodu Gir
              </a>
            </div>

            {polling && (
              <div className="text-center text-slate-600 dark:text-slate-400">
                <p>İzinleri onayladıktan sonra bekleyin...</p>
                <div className="mt-2 animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-green-900 dark:text-green-100">
              ✅ Başarılı!
            </h2>
            <p className="mb-4 text-green-800 dark:text-green-200">
              Refresh token alındı. Aşağıdaki satırı .env.local dosyanıza ekleyin:
            </p>
            <div className="bg-slate-100 dark:bg-slate-700 rounded p-4 font-mono text-sm break-all">
              OUTLOOK_REFRESH_TOKEN={result.refresh_token}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `OUTLOOK_REFRESH_TOKEN=${result.refresh_token}`
                )
                alert('Kopyalandı!')
              }}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Kopyala
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>
    </main>
  )
}

