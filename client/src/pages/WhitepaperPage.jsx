import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import whitepaperContent from '../../docs/StockPredictorAI_WhitePaper.md?raw';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const WhitepaperPage = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header / Navigation */}
                <div className="flex flex-row justify-between items-center mb-8 sm:mb-12 gap-4">
                    <Link to="/" className="flex items-center text-gray-400 hover:text-white transition-colors text-sm sm:text-base">
                        <FaArrowLeft className="mr-2" />
                        <span className="hidden sm:inline">Back to Home</span>
                        <span className="sm:hidden">Home</span>
                    </Link>

                    <a
                        href="/docs/StockPredictorAI_WhitePaper.pdf"
                        download
                        className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-3 sm:px-6 sm:py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/30"
                        title="Download PDF"
                    >
                        <FaFilePdf className="text-xl sm:mr-2" />
                        <span className="hidden sm:inline">Download PDF Version</span>
                    </a>
                </div>

                {/* Content Container */}
                <article className="prose prose-invert prose-sm sm:prose-lg max-w-none bg-gray-800/50 p-6 sm:p-8 md:p-12 rounded-2xl border border-gray-700 shadow-2xl">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Custom styling for specific elements if needed
                            h1: ({ node, ...props }) => <h1 className="text-2xl sm:text-4xl font-bold text-blue-400 mb-6 sm:mb-8 border-b border-gray-700 pb-4" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl sm:text-2xl font-semibold text-gray-200 mt-8 sm:mt-12 mb-4 sm:mb-6" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg sm:text-xl font-medium text-gray-300 mt-6 sm:mt-8 mb-3 sm:mb-4" {...props} />,
                            p: ({ node, ...props }) => <p className="text-gray-300 leading-relaxed mb-4 sm:mb-6" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 sm:ml-6 mb-4 sm:mb-6 text-gray-300" {...props} />,
                            li: ({ node, ...props }) => <li className="mb-2" {...props} />,
                            table: ({ node, ...props }) => <div className="overflow-x-auto my-6 sm:my-8"><table className="min-w-full divide-y divide-gray-700" {...props} /></div>,
                            th: ({ node, ...props }) => <th className="px-4 sm:px-6 py-3 bg-gray-700 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" {...props} />,
                            td: ({ node, ...props }) => <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300 border-t border-gray-700" {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4 sm:my-6" {...props} />,
                            a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                        }}
                    >
                        {whitepaperContent}
                    </ReactMarkdown>
                </article>

                {/* Footer Call to Action */}
                <div className="mt-12 sm:mt-16 text-center">
                    <p className="text-gray-400 mb-4 sm:mb-6">Ready to join the revolution?</p>
                    <Link
                        to="/login"
                        className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-xl"
                    >
                        Get Started Now
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default WhitepaperPage;
