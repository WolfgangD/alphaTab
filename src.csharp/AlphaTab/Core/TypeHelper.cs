﻿using System.Globalization;
using System.Runtime.CompilerServices;
using AlphaTab.Core.EcmaScript;

namespace AlphaTab.Core
{
    internal static class TypeHelper
    {
        public static IList<T> CreateList<T>(params T[] values)
        {
            return new List<T>(values);
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string Substring(this string s, double start, double length)
        {
            return s.Substring((int) start, (int) length);
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string Substr(this string s, double start, double end)
        {
            return s.Substring((int) start, (int) (end - start));
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string Substr(this string s, double start)
        {
            return s.Substring((int) start);
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static int CharCodeAt(this string s, double index)
        {
            return s[(int) index];
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string ToLowerCase(this string s)
        {
            return s.ToLowerInvariant();
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static string ToUpperCase(this string s)
        {
            return s.ToUpperInvariant();
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static IList<string> Split(this string s, string separator)
        {
            return new List<string>(s.Split(separator));
        }

        public static MapEntry<double, TValue> CreateMapEntry<TValue>(int key, TValue value)
        {
            return new MapEntry<double, TValue>(key, value);
        }

        public static MapEntry<TKey, double> CreateMapEntry<TKey>(TKey key, int value)
        {
            return new MapEntry<TKey, double>(key, value);
        }

        public static MapEntry<TKey, TValue> CreateMapEntry<TKey, TValue>(TKey key, TValue value)
        {
            return new MapEntry<TKey, TValue>(key, value);
        }

        public static string ToString(this double num, int radix)
        {
            if (radix == 16)
            {
                return ((int) num).ToString("X");
            }

            return num.ToString(CultureInfo.InvariantCulture);
        }
    }
}
