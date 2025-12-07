import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useTranslation } from 'react-i18next';
import whitepaperContent from '../../docs/StockPredictorAI_WhitePaper.md?raw';
import scoringModelContent from '../../docs/ScoringModel_Public.md?raw';
import { FaFilePdf, FaArrowLeft, FaFileAlt, FaChartBar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import 'katex/dist/katex.min.css'; // Ensure katex CSS is imported

const DOCUMENTS = {
    whitepaper: {
        id: 'whitepaper',
        title: 'Whitepaper',
        icon: FaFileAlt,
        content: whitepaperContent,
        pdfUrl: '/docs/StockPredictorAI_WhitePaper.pdf',
        pdfLabel: 'Download Whitepaper PDF'
    },
    scoringModel: {
        id: 'scoringModel',
        title: 'Scoring Model',
        icon: FaChartBar,
        content: scoringModelContent,
        pdfUrl: null, // No PDF for scoring model yet, or add if available
        pdfLabel: null
    }
};

const WhitepaperPage = () => {
    const { t } = useTranslation();
    const [activeDoc, setActiveDoc] = useState('whitepaper');

    const currentDoc = DOCUMENTS[activeDoc];

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

                {/* Sidebar Navigation */}
                <aside className="lg:w-1/4 flex-shrink-0">
                    <div className="bg-gray-800 rounded-xl p-6 sticky top-8 border border-gray-700">
                        <Link to="/" className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group">
                            <FaArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
                            <span>Back to Home</span>
                        </Link>

                        <h2 className="text-xl font-bold text-white mb-6 px-2">Documentation</h2>
                        <nav className="space-y-2">
                            {Object.values(DOCUMENTS).map((doc) => {
                                const Icon = doc.icon;
                                const isActive = activeDoc === doc.id;
                                return (
                                    <button
                                        key={doc.id}
                                        onClick={() => setActiveDoc(doc.id)}
                                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${isActive
                                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                                                : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                            }`}
                                    >
                                        <Icon className={`mr-3 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                                        <span className="font-medium">{doc.title}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0">
                    {/* Header With Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                            {currentDoc.title}
                        </h1>

                        {currentDoc.pdfUrl && (
                            <a
                                href={currentDoc.pdfUrl}
                                download
                                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/30 text-sm"
                            >
                                <FaFilePdf className="mr-2" />
                                {currentDoc.pdfLabel}
                            </a>
                        )}
                    </div>

                    {/* Markdown Renderer */}
                    <article className="prose prose-invert prose-lg max-w-none bg-gray-800/30 p-8 sm:p-12 rounded-2xl border border-gray-700 shadow-2xl">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-blue-400 mb-6 border-b border-gray-700 pb-4 mt-8 first:mt-0" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold text-gray-200 mt-10 mb-4 flex items-center" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-xl font-medium text-gray-300 mt-8 mb-3" {...props} />,
                                p: ({ node, ...props }) => <p className="text-gray-300 leading-relaxed mb-6" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 mb-6 text-gray-300 space-y-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 mb-6 text-gray-300 space-y-1" {...props} />,
                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                table: ({ node, ...props }) => <div className="overflow-x-auto my-8 border border-gray-700 rounded-lg"><table className="min-w-full divide-y divide-gray-700" {...props} /></div>,
                                th: ({ node, ...props }) => <th className="px-6 py-4 bg-gray-700 text-left text-xs font-bold text-gray-200 uppercase tracking-wider whitespace-nowrap" {...props} />,
                                td: ({ node, ...props }) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 border-t border-gray-700" {...props} />,
                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-6 py-2 bg-gray-800/50 rounded-r-lg" {...props} />,
                                a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors" {...props} />,
                                code: ({ node, inline, className, children, ...props }) => {
                                    return inline ? (
                                        <code className="bg-gray-700/50 px-1.5 py-0.5 rounded text-pink-400 font-mono text-sm" {...props}>
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="block bg-gray-900 p-4 rounded-lg overflow-x-auto text-gray-300 font-mono text-sm border border-gray-700 my-4" {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                            }}
                        >
                            {currentDoc.content}
                        </ReactMarkdown>
                    </article>

                    {/* Footer CTA */}
                    <div className="mt-16 text-center border-t border-gray-800 pt-12">
                        <p className="text-gray-400 mb-6 text-lg">Ready to see the theory in action?</p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg px-8 py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-xl hover:shadow-indigo-500/25"
                        >
                            Get Started Now
                        </Link>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default WhitepaperPage;
