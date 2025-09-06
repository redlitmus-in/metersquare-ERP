import React, { useState } from 'react';
import ModernErrorPage from '@/components/ui/ModernErrorPage';
import { ChevronLeft, ChevronRight, Palette, Eye } from 'lucide-react';

const ErrorPageDemo: React.FC = () => {
  const [currentVariant, setCurrentVariant] = useState(0);
  const [errorCode, setErrorCode] = useState('404');
  const [fullScreen, setFullScreen] = useState(false);

  const variants = [
    {
      name: 'minimal-lines',
      title: 'Minimal Lines',
      description: 'Clean design with animated border lines using brand colors'
    },
    {
      name: 'glass-card',
      title: 'Glass Card',
      description: 'Modern glassmorphism effect with gradient background'
    },
    {
      name: 'gradient-wave',
      title: 'Gradient Wave',
      description: 'Dynamic gradient animations with dark theme'
    },
    {
      name: 'geometric',
      title: 'Geometric Pattern',
      description: 'Minimalist design with geometric shapes'
    },
    {
      name: 'construction',
      title: 'Construction Theme',
      description: 'Perfect for construction/maintenance related errors'
    }
  ];

  const errorCodes = [
    { code: '404', title: 'Page Not Found', message: 'The page you are looking for might have been removed or is temporarily unavailable.' },
    { code: '403', title: 'Access Forbidden', message: 'You don\'t have permission to access this resource.' },
    { code: '500', title: 'Server Error', message: 'Something went wrong on our end. Please try again later.' },
    { code: '503', title: 'Service Unavailable', message: 'We\'re currently performing maintenance. Please check back soon.' },
    { code: 'offline', title: 'No Connection', message: 'Please check your internet connection and try again.' }
  ];

  const currentError = errorCodes.find(e => e.code === errorCode) || errorCodes[0];

  const nextVariant = () => {
    setCurrentVariant((prev) => (prev + 1) % variants.length);
  };

  const prevVariant = () => {
    setCurrentVariant((prev) => (prev - 1 + variants.length) % variants.length);
  };

  if (fullScreen) {
    return (
      <>
        <button
          onClick={() => setFullScreen(false)}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-black/50 backdrop-blur text-white rounded-lg hover:bg-black/60 transition-colors"
        >
          Exit Preview
        </button>
        <ModernErrorPage
          variant={variants[currentVariant].name as any}
          errorCode={currentError.code}
          errorTitle={currentError.title}
          errorMessage={currentError.message}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Palette className="w-8 h-8 text-blue-500" />
                Modern Error Page Designs
              </h1>
              <p className="text-gray-600 mt-2">Choose your preferred error page design for the MeterSquare ERP</p>
            </div>
            <button
              onClick={() => setFullScreen(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Full Preview
            </button>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Variant Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Design Variant</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevVariant}
                  className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <div className="font-semibold text-gray-800">{variants[currentVariant].title}</div>
                  <div className="text-sm text-gray-600">{variants[currentVariant].description}</div>
                </div>
                <button
                  onClick={nextVariant}
                  className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Error Code Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Error Type</label>
              <select
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {errorCodes.map((error) => (
                  <option key={error.code} value={error.code}>
                    {error.code} - {error.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Variant Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {variants.map((variant, index) => (
              <button
                key={variant.name}
                onClick={() => setCurrentVariant(index)}
                className={`px-4 py-2 rounded-full transition-colors ${
                  currentVariant === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {variant.title}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gray-800 p-3 flex items-center gap-2">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-gray-400 text-sm">Preview: {variants[currentVariant].title}</span>
            </div>
          </div>
          
          <div className="relative" style={{ height: '600px' }}>
            <div className="absolute inset-0 scale-75 origin-top">
              <ModernErrorPage
                variant={variants[currentVariant].name as any}
                errorCode={currentError.code}
                errorTitle={currentError.title}
                errorMessage={currentError.message}
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Brand Colors</h3>
                <p className="text-sm text-gray-600">Uses your brand colors (Red, Blue, Green)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Smooth Animations</h3>
                <p className="text-sm text-gray-600">Framer Motion powered animations</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-gray-800">Responsive Design</h3>
                <p className="text-sm text-gray-600">Works perfectly on all devices</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPageDemo;