import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Home, 
  RefreshCw, 
  ArrowLeft,
  Wifi,
  WifiOff,
  Construction,
  ShieldAlert,
  XCircle,
  ServerCrash,
  FileX,
  Ban,
  Wrench,
  Settings,
  Hammer,
  PaintBucket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernLoadingSpinners from './ModernLoadingSpinners';

interface ErrorPageProps {
  variant?: 'minimal-lines' | 'glass-card' | 'gradient-wave' | 'geometric' | 'construction' | 'blueprint' | 'under-construction' | 'tools-workshop';
  errorCode?: string;
  errorTitle?: string;
  errorMessage?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
}

const ModernErrorPage: React.FC<ErrorPageProps> = ({
  variant = 'minimal-lines',
  errorCode = '404',
  errorTitle = 'Page Not Found',
  errorMessage = 'The page you are looking for might have been removed or is temporarily unavailable.',
  showBackButton = true,
  showHomeButton = true,
  showRefreshButton = true,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    } else {
      window.location.reload();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getErrorIcon = () => {
    switch(errorCode) {
      case '404': return <FileX className="w-16 h-16" />;
      case '403': return <Ban className="w-16 h-16" />;
      case '500': return <ServerCrash className="w-16 h-16" />;
      case '503': return <Construction className="w-16 h-16" />;
      case 'offline': return <WifiOff className="w-16 h-16" />;
      default: return <AlertTriangle className="w-16 h-16" />;
    }
  };

  // Variant 1: Minimal with animated lines
  const MinimalLinesError = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Animated lines background */}
        <div className="relative mb-8">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-48 h-48">
              <motion.div
                className="absolute top-0 left-0 w-full h-0.5 bg-red-500"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
              <motion.div
                className="absolute top-0 right-0 w-0.5 h-full bg-blue-500"
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
              <motion.div
                className="absolute bottom-0 right-0 w-full h-0.5 bg-green-500"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.6 }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-0.5 h-full bg-red-500"
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                transition={{ duration: 0.8, delay: 0.8 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="text-gray-700"
                >
                  {getErrorIcon()}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-48"
        >
          <h1 className="text-6xl font-bold text-gray-800 mb-4">{errorCode}</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">{errorTitle}</h2>
          <p className="text-gray-600 mb-8">{errorMessage}</p>

          <div className="flex justify-center gap-4">
            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            )}
            {showHomeButton && (
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            )}
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-green-500 text-white rounded-lg flex items-center gap-2 hover:bg-green-600 transition-colors"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );

  // Variant 2: Glass Card Effect
  const GlassCardError = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-red-600 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="flex justify-center mb-6 text-white"
          >
            {getErrorIcon()}
          </motion.div>

          <h1 className="text-5xl font-bold text-white text-center mb-4">{errorCode}</h1>
          <h2 className="text-xl font-semibold text-white/90 text-center mb-4">{errorTitle}</h2>
          <p className="text-white/70 text-center mb-8">{errorMessage}</p>

          <div className="flex flex-col gap-3">
            {showHomeButton && (
              <button
                onClick={() => navigate('/')}
                className="w-full px-6 py-3 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </button>
            )}
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                className="w-full px-6 py-3 bg-white/10 backdrop-blur text-white rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  // Variant 3: Gradient Wave
  const GradientWaveError = () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, #ef4444 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, #3b82f6 0%, transparent 50%)',
              'radial-gradient(circle at 50% 50%, #10b981 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, #ef4444 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="inline-block mb-8 text-white/80"
        >
          {getErrorIcon()}
        </motion.div>

        <h1 className="text-7xl font-bold bg-gradient-to-r from-red-400 via-blue-400 to-green-400 bg-clip-text text-transparent mb-4">
          {errorCode}
        </h1>
        <h2 className="text-2xl font-semibold text-white mb-4">{errorTitle}</h2>
        <p className="text-gray-400 mb-8">{errorMessage}</p>

        <div className="flex justify-center gap-4">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {showHomeButton && (
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-red-500 via-blue-500 to-green-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );

  // Variant 4: Geometric Pattern
  const GeometricError = () => (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="relative max-w-md w-full">
        {/* Geometric shapes */}
        <motion.div
          className="absolute -top-20 -left-20 w-40 h-40 border-4 border-red-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-32 h-32 bg-blue-500/10 rounded-lg"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-10 right-10 w-20 h-20 border-2 border-green-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="inline-block mb-6 text-gray-700"
          >
            {getErrorIcon()}
          </motion.div>

          <h1 className="text-8xl font-black text-gray-900 mb-2">{errorCode}</h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{errorTitle}</h2>
          <p className="text-gray-600 mb-8 max-w-sm mx-auto">{errorMessage}</p>

          <div className="flex justify-center gap-3">
            {showHomeButton && (
              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                Return Home
              </button>
            )}
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                className="px-8 py-3 border-2 border-black text-black rounded-full hover:bg-black hover:text-white transition-colors"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Variant 5: Construction Theme
  const ConstructionError = () => (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block mb-6"
        >
          <div className="relative">
            <Construction className="w-24 h-24 text-orange-500" />
            <motion.div
              className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </motion.div>

        <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-orange-500">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">{errorCode}</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">{errorTitle}</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-0.5 w-8 bg-red-500"></div>
            <div className="h-0.5 w-8 bg-blue-500"></div>
            <div className="h-0.5 w-8 bg-green-500"></div>
          </div>
          <p className="text-gray-600 mb-8">{errorMessage}</p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            )}
            {showHomeButton && (
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home Page
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Variant 6: Blueprint Theme (404 - Page Under Construction)
  const BlueprintError = () => (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Blueprint grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(white 1px, transparent 1px),
            linear-gradient(90deg, white 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Technical drawing lines */}
      <motion.div
        className="absolute top-20 left-20 w-64 h-64 border border-white/20 rounded"
        animate={{ rotate: [0, 5, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-48 h-48 border-2 border-dashed border-white/10"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-8 border border-white/20">
          {/* Blueprint style header */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-red-500/20 blur-xl"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Construction className="w-20 h-20 text-white relative z-10" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-2">
              {errorCode === '404' ? '404' : errorCode}
            </h1>
            <h2 className="text-xl font-semibold text-white/90 mb-4">
              {errorCode === '404' ? 'Blueprint Not Found' : errorTitle}
            </h2>
            
            {/* Technical specs style message */}
            <div className="bg-white/5 rounded p-4 mb-6 border border-white/10">
              <p className="text-white/70 text-sm font-mono">
                {errorCode === '404' 
                  ? 'PROJECT STATUS: The requested floor plan or blueprint is currently being drafted by our architects.'
                  : errorMessage}
              </p>
            </div>

            {/* Measurement lines decoration */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="h-px w-8 bg-red-500"></div>
                <span className="text-red-500 text-xs">ERROR</span>
                <div className="h-px w-8 bg-red-500"></div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              {showHomeButton && (
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-white/10 backdrop-blur text-white rounded hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
                >
                  <Home className="w-4 h-4" />
                  Return to Office
                </button>
              )}
              {showRefreshButton && (
                <button
                  onClick={handleRefresh}
                  className="px-6 py-3 bg-red-500/20 backdrop-blur text-white rounded hover:bg-red-500/30 transition-colors flex items-center gap-2 border border-red-500/30"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Redraft
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Variant 7: Under Construction (500 - Server Error)
  const UnderConstructionError = () => (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Warning stripes header */}
        <div className="h-4 bg-repeating-linear-gradient(45deg, #000, #000 10px, #fbbf24 10px, #fbbf24 20px) rounded-t-lg"
          style={{
            background: 'repeating-linear-gradient(45deg, #000, #000 10px, #fbbf24 10px, #fbbf24 20px)'
          }}
        />
        
        <div className="bg-white rounded-b-lg shadow-xl p-8">
          {/* Animated construction crane */}
          <div className="relative h-32 mb-6">
            <motion.div
              className="absolute left-1/2 top-0"
              animate={{ rotate: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{ transformOrigin: 'bottom center' }}
            >
              <div className="w-1 h-24 bg-gray-800 relative">
                <div className="absolute -top-1 -left-2 w-5 h-5 bg-red-500 rounded-full">
                  <motion.div
                    className="absolute inset-0 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
                <div className="absolute top-0 left-0 w-16 h-1 bg-gray-800" />
                <motion.div
                  className="absolute top-0 left-16 w-1 h-8 bg-gray-600"
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Construction className="w-6 h-6 text-orange-500 absolute -bottom-6 -left-3" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-800 mb-2">
              {errorCode === '500' ? '500' : errorCode}
            </h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {errorCode === '500' ? 'Site Under Construction' : errorTitle}
            </h2>
            
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-gray-600 text-sm">
                <strong className="text-yellow-600">⚠ NOTICE:</strong><br />
                {errorCode === '500' 
                  ? 'Our interior designers are currently renovating this section. We apologize for the inconvenience.'
                  : errorMessage}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-1">Renovation Progress</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-500 via-blue-500 to-green-500"
                  animate={{ width: ['0%', '70%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
            </div>

            <div className="flex justify-center gap-3">
              {showBackButton && (
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
              )}
              {showHomeButton && (
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Main Entrance
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Variant 8: Tools Workshop (Network/503 Error)
  const ToolsWorkshopError = () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
      {/* Animated tools background */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <motion.div
          className="absolute top-10 left-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <Wrench className="w-20 h-20 text-white" />
        </motion.div>
        <motion.div
          className="absolute bottom-10 right-10"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <Settings className="w-16 h-16 text-white" />
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-1/4"
          animate={{ y: [-20, 20, -20] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          <Hammer className="w-12 h-12 text-white" />
        </motion.div>
      </div>

      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Tool rack header */}
          <div className="bg-gradient-to-r from-red-600 via-blue-600 to-green-600 p-1">
            <div className="bg-gray-800 p-4">
              <div className="flex items-center justify-center gap-4">
                <Wrench className="w-6 h-6 text-red-400" />
                <Hammer className="w-6 h-6 text-blue-400" />
                <PaintBucket className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center">
              {/* WiFi/Network indicator */}
              {(errorCode === 'offline' || errorCode === '503') && (
                <motion.div
                  className="inline-block mb-4"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <WifiOff className="w-16 h-16 text-red-500 mx-auto" />
                </motion.div>
              )}

              <h1 className="text-6xl font-bold text-white mb-2">
                {errorCode === 'offline' ? 'OFFLINE' : errorCode}
              </h1>
              <h2 className="text-xl font-semibold text-gray-300 mb-4">
                {errorCode === 'offline' 
                  ? 'Workshop Disconnected' 
                  : errorCode === '503'
                  ? 'Tools Under Maintenance'
                  : errorTitle}
              </h2>

              {/* Workshop notice board */}
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-400 text-sm text-left">
                    {errorCode === 'offline'
                      ? 'The workshop network connection has been interrupted. Please check your cables and connections.'
                      : errorCode === '503'
                      ? 'Our tools are being serviced and calibrated. Normal operations will resume shortly.'
                      : errorMessage}
                  </p>
                </div>
              </div>

              {/* Status indicators */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-gray-700/50 rounded p-2">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${errorCode === 'offline' ? 'bg-red-500' : 'bg-green-500'}`} />
                  <div className="text-xs text-gray-500">Network</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${errorCode === '503' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <div className="text-xs text-gray-500">Server</div>
                </div>
                <div className="bg-gray-700/50 rounded p-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mb-1" />
                  <div className="text-xs text-gray-500">Power</div>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                {showHomeButton && (
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Exit Workshop
                  </button>
                )}
                {showRefreshButton && (
                  <button
                    onClick={handleRefresh}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Reconnect
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render based on variant
  switch(variant) {
    case 'glass-card':
      return <GlassCardError />;
    case 'gradient-wave':
      return <GradientWaveError />;
    case 'geometric':
      return <GeometricError />;
    case 'construction':
      return <ConstructionError />;
    case 'blueprint':
      return <BlueprintError />;
    case 'under-construction':
      return <UnderConstructionError />;
    case 'tools-workshop':
      return <ToolsWorkshopError />;
    default:
      return <MinimalLinesError />;
  }
};

export default ModernErrorPage;