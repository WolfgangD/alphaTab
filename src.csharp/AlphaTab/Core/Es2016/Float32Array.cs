﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using AlphaTab.Core.Es2015;

namespace AlphaTab.Core.Es2016
{
    public class Float32Array
    {
        private float[] _data;
        public double Length => _data.Length;

        public Float32Array(ArrayBuffer buffer)
        {
            throw new NotImplementedException();
        }
        public Float32Array(double size)
        {
            throw new NotImplementedException();
        }

        public Float32Array(IEnumerable<double> values)
        {
            throw new NotImplementedException();
        }

        public Float32Array(IEnumerable<int> values)
        {
            throw new NotImplementedException();
        }

        public double this[double index]
        {
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            get =>             throw new NotImplementedException();
            [MethodImpl(MethodImplOptions.AggressiveInlining)]
            set =>            throw new NotImplementedException();

        }

        public Float32Array Subarray(double offset, double writeToEnd)
        {
            throw new System.NotImplementedException();
        }

        public void Set(Float32Array subarray, double writePosition)
        {
            throw new System.NotImplementedException();
        }
    }
}
