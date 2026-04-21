// 日日好日 — Energy Quiz Page
// Design: Vacanza-inspired minimal quiz
import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, RotateCcw, ShoppingBag } from "lucide-react";
import { quizQuestions, categoryResultMap, products } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

export default function Quiz() {
  const [currentStep, setCurrentStep] = useState(0); // 0=intro, 1-3=questions, 4=result
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const { addToCart } = useCart();

  const totalSteps = quizQuestions.length;

  const handleAnswer = (value: string) => setSelectedOption(value);

  const handleNext = () => {
    if (!selectedOption) return;
    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    setSelectedOption(null);
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    if (currentStep === totalSteps) setCurrentStep(totalSteps + 1);
  };

  const getResult = () => {
    const counts: Record<string, number> = {};
    answers.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
    const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "healing";
    return products.find((p) => p.id === categoryResultMap[topCategory]);
  };

  const handleReset = () => { setCurrentStep(0); setAnswers([]); setSelectedOption(null); };

  const resultProduct = currentStep === totalSteps + 1 ? getResult() : null;

  const handleAddToCart = () => {
    if (resultProduct) {
      addToCart(resultProduct);
      toast.success(`已加入購物袋：${resultProduct.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* Page Header */}
      <div className="border-b border-[oklch(0.93_0_0)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">
          <p className="eyebrow mb-2">ENERGY QUIZ</p>
          <h1 className="heading-lg">能量水晶測驗</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">

        {/* Intro */}
        {currentStep === 0 && (
          <div className="text-center">
            <div className="text-6xl text-[oklch(0.88_0.04_15)] mb-8">◈</div>
            <p className="eyebrow mb-4">30 SECONDS · 3 QUESTIONS</p>
            <h2 className="heading-lg mb-6">找到你的能量水晶</h2>
            <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-10 max-w-sm mx-auto">
              每個人的能量場都是獨一無二的。透過 3 個簡單的問題，我們將為你找到最適合你目前狀態的能量水晶。
            </p>
            <button onClick={() => setCurrentStep(1)} className="btn-primary">
              開始測驗 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Questions */}
        {currentStep >= 1 && currentStep <= totalSteps && (
          <div>
            {/* Progress */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <span className="eyebrow">問題 {currentStep} / {totalSteps}</span>
                <span className="eyebrow">{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <div className="h-px bg-[oklch(0.9_0_0)] relative">
                <div
                  className="absolute top-0 left-0 h-px bg-[oklch(0.1_0_0)] transition-all duration-500"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <h2 className="heading-lg mb-8 text-center">
              {quizQuestions[currentStep - 1].question}
            </h2>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {quizQuestions[currentStep - 1].options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  className={`p-6 text-left border transition-all duration-200 ${
                    selectedOption === option.value
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                      : "border-[oklch(0.9_0_0)] bg-white hover:border-[oklch(0.6_0_0)]"
                  }`}
                >
                  <div className="text-2xl mb-3">{option.icon}</div>
                  <p className="text-sm font-body font-light text-[oklch(0.3_0_0)] leading-relaxed">
                    {option.text}
                  </p>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleNext}
                disabled={!selectedOption}
                className={`btn-primary ${!selectedOption ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                {currentStep === totalSteps ? "查看結果" : "下一題"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {currentStep === totalSteps + 1 && resultProduct && (
          <div>
            <div className="text-center mb-10">
              <p className="eyebrow mb-3">YOUR CRYSTAL MATCH</p>
              <h2 className="heading-lg mb-2">你的能量水晶是</h2>
              <p className="text-2xl font-light italic text-[oklch(0.72_0.09_70)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
                {resultProduct.crystalType}
              </p>
            </div>

            {/* Result Card */}
            <div className="border border-[oklch(0.93_0_0)] mb-8">
              <div className="aspect-video overflow-hidden bg-[oklch(0.97_0_0)]">
                <img
                  src={resultProduct.image}
                  alt={resultProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex gap-2 mb-3">
                  {resultProduct.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
                <h3 className="text-2xl font-medium text-[oklch(0.1_0_0)] mb-2" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
                  {resultProduct.name}
                </h3>
                <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-5">
                  {resultProduct.story.slice(0, 120)}...
                </p>
                <div className="flex items-center justify-between border-t border-[oklch(0.93_0_0)] pt-5">
                  <span className="text-2xl font-medium text-[oklch(0.1_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
                    NT$ {resultProduct.price.toLocaleString()}
                  </span>
                  <div className="flex gap-3">
                    <Link href={`/products/${resultProduct.id}`}>
                      <button className="btn-outline text-xs py-2.5 px-4">了解更多</button>
                    </Link>
                    <button onClick={handleAddToCart} className="btn-primary text-xs py-2.5 px-4">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      加入購物袋
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 text-xs font-body tracking-[0.1em] text-[oklch(0.55_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重新測驗
              </button>
              <Link href="/products">
                <button className="btn-outline text-xs">探索更多水晶</button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
