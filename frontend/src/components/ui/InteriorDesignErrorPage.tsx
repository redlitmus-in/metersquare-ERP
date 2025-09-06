import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home,
  RefreshCw,
  ArrowLeft,
  Palette,
  Layers,
  Grid3x3,
  Ruler,
  PaintBucket,
  Sofa,
  Lightbulb,
  Square,
  Circle,
  Triangle,
  Hexagon,
  PenTool,
  Brush,
  Sparkles,
  Eye,
  FileX,
  Ban,
  ServerCrash,
  WifiOff,
  AlertTriangle,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModernLoadingSpinners from './ModernLoadingSpinners';

interface InteriorErrorPageProps {
  variant?: 'mood-board' | 'floor-plan' | 'material-palette' | 'furniture-layout' | 'lighting-design' | 'render-studio';
  errorCode?: string;
  errorTitle?: string;
  errorMessage?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
}

const InteriorDesignErrorPage: React.FC<InteriorErrorPageProps> = ({
  variant = 'mood-board',
  errorCode = '404',
  errorTitle,
  errorMessage,
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

  // Get interior design specific messages
  const getInteriorMessage = () => {
    switch(errorCode) {
      case '404':
        return {
          title: errorTitle || 'Design Concept Not Found',
          message: errorMessage || 'The mood board or design specification you\'re looking for is being updated by our design team.'
        };
      case '403':
        return {
          title: errorTitle || 'Client Approval Required',
          message: errorMessage || 'This design concept requires client authorization before viewing.'
        };
      case '500':
        return {
          title: errorTitle || 'Design Studio Under Renovation',
          message: errorMessage || 'Our design systems are being upgraded with new material libraries and 3D assets.'
        };
      case '503':
        return {
          title: errorTitle || 'Material Library Updating',
          message: errorMessage || 'We\'re refreshing our material samples and finish selections. Please check back shortly.'
        };
      case 'offline':
        return {
          title: errorTitle || 'Design Cloud Disconnected',
          message: errorMessage || 'Unable to sync with our design cloud. Please check your connection.'
        };
      default:
        return {
          title: errorTitle || 'Design Process Interrupted',
          message: errorMessage || 'Something went wrong in the design workflow.'
        };
    }
  };

  const interiorInfo = getInteriorMessage();

  // Variant 1: Mood Board Style (404)
  const MoodBoardError = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Mood board grid */}
        <div className="grid grid-cols-4 gap-2 mb-8 opacity-10">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="aspect-square rounded-lg"
              style={{
                background: ['#ef4444', '#3b82f6', '#10b981', '#fbbf24', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][i]
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.1, type: "spring" }}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100 to-transparent rounded-bl-full opacity-50" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-100 to-transparent rounded-tr-full opacity-50" />

          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <motion.div
                className="relative"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Palette className="w-16 h-16 text-gray-700" />
                <motion.div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            </div>

            <h1 className="text-5xl font-bold text-gray-800 text-center mb-2">{errorCode}</h1>
            <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">{interiorInfo.title}</h2>
            
            {/* Material swatches */}
            <div className="flex justify-center gap-2 mb-6">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300" title="Wood" />
              <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-300 to-gray-400 border border-gray-500" title="Metal" />
              <div className="w-8 h-8 rounded bg-gradient-to-br from-stone-200 to-stone-300 border border-stone-400" title="Stone" />
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300" title="Fabric" />
            </div>

            <p className="text-gray-600 text-center mb-8">{interiorInfo.message}</p>

            <div className="flex justify-center gap-3">
              {showBackButton && (
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Gallery
                </button>
              )}
              {showHomeButton && (
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-600 transition-colors flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Design Studio
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Variant 2: Floor Plan Style (404)
  const FloorPlanError = () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Grid background like CAD */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(cyan 1px, transparent 1px),
            linear-gradient(90deg, cyan 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }} />
      </div>

      {/* Floating floor plan elements */}
      <motion.div
        className="absolute top-20 left-20 w-32 h-32 border-2 border-cyan-500/20"
        animate={{ rotate: 90 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-24 h-48 border-2 border-cyan-500/20"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-cyan-500/30 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Grid3x3 className="w-16 h-16 text-cyan-400" />
              <Ruler className="w-8 h-8 text-cyan-300 absolute -bottom-2 -right-2" />
            </div>
          </div>

          <h1 className="text-6xl font-mono font-bold text-cyan-400 text-center mb-2">{errorCode}</h1>
          <h2 className="text-xl font-semibold text-cyan-300 text-center mb-4">
            {errorCode === '404' ? 'Floor Plan Not Rendered' : interiorInfo.title}
          </h2>

          {/* Dimension lines */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="h-px w-12 bg-red-500"></div>
              <span className="text-red-500 text-xs font-mono">X</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-12 bg-green-500"></div>
              <span className="text-green-500 text-xs font-mono">Y</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-12 bg-blue-500"></div>
              <span className="text-blue-500 text-xs font-mono">Z</span>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded p-4 mb-6 border border-cyan-500/20">
            <p className="text-cyan-100/70 text-sm font-mono">
              <span className="text-cyan-400">STATUS:</span> {interiorInfo.message}
            </p>
          </div>

          <div className="flex justify-center gap-3">
            {showHomeButton && (
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 rounded hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Return to Drawings
              </button>
            )}
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors flex items-center gap-2"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Variant 3: Material Palette (500)
  const MaterialPaletteError = () => (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Material samples header */}
          <div className="grid grid-cols-5 h-20">
            <motion.div 
              className="bg-gradient-to-br from-amber-600 to-amber-700"
              whileHover={{ scale: 1.1, zIndex: 10 }}
              title="Oak Wood"
            />
            <motion.div 
              className="bg-gradient-to-br from-gray-600 to-gray-700"
              whileHover={{ scale: 1.1, zIndex: 10 }}
              title="Brushed Steel"
            />
            <motion.div 
              className="bg-gradient-to-br from-stone-400 to-stone-500"
              whileHover={{ scale: 1.1, zIndex: 10 }}
              title="Marble"
            />
            <motion.div 
              className="bg-gradient-to-br from-emerald-600 to-emerald-700"
              whileHover={{ scale: 1.1, zIndex: 10 }}
              title="Velvet"
            />
            <motion.div 
              className="bg-gradient-to-br from-slate-800 to-slate-900"
              whileHover={{ scale: 1.1, zIndex: 10 }}
              title="Leather"
            />
          </div>

          <div className="p-8">
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <PaintBucket className="w-16 h-16 text-amber-600" />
              </motion.div>
            </div>

            <h1 className="text-5xl font-bold text-gray-800 text-center mb-2">{errorCode}</h1>
            <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">
              {errorCode === '500' ? 'Material Library Refreshing' : interiorInfo.title}
            </h2>

            {/* Texture patterns */}
            <div className="flex justify-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-400 animate-spin-slow" />
              <div className="w-12 h-12 rounded border-2 border-dotted border-gray-400 animate-pulse" />
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300" />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-gray-600 text-sm">
                <strong className="text-amber-700">SPECIFICATION UPDATE:</strong><br />
                {interiorInfo.message}
              </p>
            </div>

            <div className="flex justify-center gap-3">
              {showBackButton && (
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              {showHomeButton && (
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Material Hub
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Variant 4: Furniture Layout (403)
  const FurnitureLayoutError = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 relative">
          {/* Furniture icons floating */}
          <motion.div
            className="absolute top-4 right-4 text-indigo-200"
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sofa className="w-8 h-8" />
          </motion.div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Ban className="w-10 h-10 text-indigo-600" />
              </motion.div>
            </div>

            <h1 className="text-5xl font-bold text-gray-800 mb-2">{errorCode}</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {errorCode === '403' ? 'Furniture Plan Locked' : interiorInfo.title}
            </h2>

            {/* Room layout grid */}
            <div className="grid grid-cols-3 gap-2 max-w-[150px] mx-auto mb-6">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-12 h-12 border-2 ${i === 4 ? 'border-red-400 bg-red-50' : 'border-gray-300'} rounded`}
                />
              ))}
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
              <p className="text-gray-600 text-sm">{interiorInfo.message}</p>
            </div>

            <div className="flex justify-center gap-3">
              {showHomeButton && (
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Showroom
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Variant 5: Lighting Design (503)
  const LightingDesignError = () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
      {/* Lighting effects */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
      />

      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
          <div className="flex justify-center mb-6">
            <motion.div
              className="relative"
              animate={{ 
                filter: ['brightness(0.5)', 'brightness(1.5)', 'brightness(0.5)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Lightbulb className="w-16 h-16 text-yellow-400" />
              <motion.div
                className="absolute inset-0 w-16 h-16"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Lightbulb className="w-16 h-16 text-yellow-400/30" />
              </motion.div>
            </motion.div>
          </div>

          <h1 className="text-5xl font-bold text-white text-center mb-2">{errorCode}</h1>
          <h2 className="text-xl font-semibold text-gray-300 text-center mb-4">
            {errorCode === '503' ? 'Lighting System Offline' : interiorInfo.title}
          </h2>

          {/* Light temperature indicators */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-400"></div>
              <span className="text-xs text-gray-400">2700K</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-200"></div>
              <span className="text-xs text-gray-400">4000K</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-200"></div>
              <span className="text-xs text-gray-400">6500K</span>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-gray-700">
            <p className="text-gray-400 text-sm">{interiorInfo.message}</p>
          </div>

          <div className="flex justify-center gap-3">
            {showHomeButton && (
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg hover:bg-yellow-600/30 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Light Studio
              </button>
            )}
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
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
  );

  // Variant 6: 3D Render Studio (Network/Offline)
  const RenderStudioError = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="relative">
          {/* 3D shapes floating */}
          <motion.div
            className="absolute -top-10 -left-10"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Square className="w-12 h-12 text-purple-400/20" />
          </motion.div>
          <motion.div
            className="absolute -top-10 -right-10"
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          >
            <Triangle className="w-12 h-12 text-pink-400/20" />
          </motion.div>
          <motion.div
            className="absolute -bottom-10 left-1/2 -translate-x-1/2"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <Hexagon className="w-12 h-12 text-indigo-400/20" />
          </motion.div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <Eye className="w-16 h-16 text-white relative z-10" />
              </div>
            </div>

            <h1 className="text-6xl font-bold text-white text-center mb-2">{errorCode}</h1>
            <h2 className="text-xl font-semibold text-white/90 text-center mb-4">
              {errorCode === 'offline' ? 'Render Cloud Disconnected' : interiorInfo.title}
            </h2>

            {/* Render progress bars */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 w-16">Model</span>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 w-16">Texture</span>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-pink-500 to-indigo-500"
                    animate={{ width: ['0%', '60%'] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 w-16">Light</span>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    animate={{ width: ['0%', '30%'] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
              <p className="text-white/70 text-sm">{interiorInfo.message}</p>
            </div>

            <div className="flex justify-center gap-3">
              {showHomeButton && (
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Brush className="w-4 h-4" />
                  Design Portal
                </button>
              )}
              {showRefreshButton && (
                <button
                  onClick={handleRefresh}
                  className="px-6 py-3 bg-white/10 backdrop-blur text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <ModernLoadingSpinners variant="pulse-wave" size="sm" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Re-render
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

  // Render based on variant
  switch(variant) {
    case 'floor-plan':
      return <FloorPlanError />;
    case 'material-palette':
      return <MaterialPaletteError />;
    case 'furniture-layout':
      return <FurnitureLayoutError />;
    case 'lighting-design':
      return <LightingDesignError />;
    case 'render-studio':
      return <RenderStudioError />;
    default:
      return <MoodBoardError />;
  }
};

export default InteriorDesignErrorPage;