"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/session";
import FirstVisitRedirect from "@/components/FirstVisitRedirect";

const steps = [
  {
    img: "/step-register.svg",
    title: "Create your account",
    text: "Register in a minute and set up your donor profile with blood group and city.",
  },
  {
    img: "/step-search.svg",
    title: "Search or request blood",
    text: "Find donors by blood group and city, or post an urgent request for a patient.",
  },
  {
    img: "/step-save.svg",
    title: "Connect and save a life",
    text: "Available donors respond, and you contact them directly.",
  },
];

const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  return (
    <main>
      <FirstVisitRedirect />
      {/* HERO */}
      <section className="bg-gradient-to-b from-red-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-gray-900 md:text-5xl">
              When every minute counts, find a blood donor near you.
            </h1>
            <p className="mt-4 max-w-md text-lg text-gray-600">
              BloodConnect links people who need blood with willing donors in
              their city, so help reaches the hospital sooner.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/donors"
                className="rounded-full bg-red-700 px-7 py-3 font-semibold text-white shadow-lg shadow-red-200 hover:bg-red-800"
              >
                Find a donor
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-full border-2 border-red-700 px-7 py-3 font-semibold text-red-700 hover:bg-red-50"
              >
                Register as donor
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src="/hero.svg"
              alt="Blood drop with a heart and donor card"
              width={520}
              height={480}
              priority
              className="h-auto w-full max-w-md"
            />
          </div>
        </div>
      </section>

      {/* BLOOD GROUPS */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Search by blood group
        </h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {groups.map((g) => (
            <Link
              key={g}
              href={`/donors?blood_group=${encodeURIComponent(g)}`}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-700 text-lg font-bold text-white shadow-md transition hover:scale-105 hover:bg-red-800"
            >
              {g}
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-red-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            How it works
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center">
                <Image
                  src={s.img}
                  alt=""
                  width={96}
                  height={96}
                  className="mx-auto"
                />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {i + 1}. {s.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-gray-600">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-14 text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          One donation can help up to three people.
        </h2>
        <p className="mt-3 text-gray-600">
          Healthy adults can donate every 3 months. Add your profile and let
          people reach you when they need you.
        </p>
        <Link
          href="/dashboard/profile"
          className="mt-6 inline-block rounded-full bg-red-700 px-8 py-3 font-semibold text-white hover:bg-red-800"
        >
          Register as donor
        </Link>
      </section>

      <footer className="border-t border-red-100 py-6 text-center text-sm text-gray-500">
        BloodConnect · Supporting SDG 3: Good Health and Well-being
      </footer>
    </main>
  );
}