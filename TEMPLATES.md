# Impulse template Sysex documentation

This document describes the sysex data Impulse devices send and receive as templates. Apart from 1 set of related values I found out what every value means / corresponds to.
There are several types of values used at specific byte offsets. First you'll find a list of value types and what each value means. At the end of this document there is a table describing at which offset which types of data are stored.


## Midi channel:

<table>
  <tr><th>Value</th><th>Midi Channel</th></tr>
  <tr><td>0x00</td><td>1</td></tr>
  <tr><td>0x01</td><td>2</td></tr>
  <tr><td>0x02</td><td>3</td></tr>
  <tr><td colspan="2">&hellip;</td></tr>
  <tr><td>0x0F</td><td>16</td></tr>
  <tr><td>0x10</td><td>Use from template</td></tr>
</table>

## Midi ports
<table>
  <tr><th>Value</th><th>Midi Channel</th></tr>
  <tr><td>0x00</td><td>From template</td></tr>
  <tr><td>0x01</td><td>Usb</td></tr>
  <tr><td>0x02</td><td>Midi</td></tr>
  <tr><td>0x03</td><td>All</td></tr>
  <tr><td>0x04</td><td>Off</td></tr>
</table>

## Keyboard velocity curve
<table>
  <tr><th>Value</th><th>Curve</th></tr>
  <tr><td>0x01</td><td>Soft</td></tr>
  <tr><td>0x02</td><td>Medium</td></tr>
  <tr><td>0x03</td><td>Hard</td></tr>
</table>

## Aftertouch
<table>
  <tr><th>Value</th><th>Status</th></tr>
  <tr><td>0x01</td><td>On</td></tr>
  <tr><td>0x00</td><td>Off</td></tr>
</table>

## Octave:
<table>
  <tr><th>Value</th><th>Octave</th></tr>
  <tr><td>0x3C</td><td>C-2</td></tr>
  <tr><td>0x3D</td><td>C-1</td></tr>
  <tr><td>0x3E</td><td>C0</td></tr>
  <tr><td>0x3F</td><td>C1</td></tr>
  <tr><td>0x40</td><td>C2</td></tr>
  <tr><td>0x41</td><td>C3</td></tr>
  <tr><td>0x42</td><td>C4</td></tr>
  <tr><td>0x43</td><td>C5</td></tr>
  <tr><td>0x44</td><td>C6</td></tr>
  <tr><td>0x45</td><td>C7</td></tr>
</table>

## Transpose
<table>
  <tr><th>Value</th><th>Semitones</th></tr>
  <tr><td>0x00</td><td>-11</td></tr>
  <tr><td>0x01</td><td>-10</td></tr>
  <tr><td colspan="2">&hellip;</td></tr>
  <tr><td>0x0B</td><td>+-0</td></tr>
  <tr><td>0x0C</td><td>+01</td></tr>
  <tr><td>0x0D</td><td>+02</td></tr>
  <tr><td colspan="2">&hellip;</td></tr>
  <tr><td>0x16</td><td>+11</td></tr>
</table>

# Keyboard/midi Zones
<table>
  <tr><th>Value</th><th>Status</th></tr>
  <tr><td>0x00</td><td>Off</td></tr>
  <tr><td>0x01</td><td>On</td></tr>
</table>

## Rotary encoders, pads and faders

The same sequence of bytes is used for encoders, drum pads and faders:<br>
    [Type] [Note/CC/Msb] [Max value] [Min value] [Midi port + channel] [Lsb] [Unknown]

### Type
<table>
  <tr><th>Value</th><th>Type of midi message</th></tr>
  <tr><td>0x08</td><td>Note on/off</td></tr>
  <tr><td>0x09</td><td>CC</td></tr>
  <tr><td>0x0A</td><td>RPN</td></tr>
  <tr><td>0x0B</td><td>NRPN</td></tr>
  <tr><td>0x11</td><td>CC again. This is used in parts of the default templates. I could not make out any difference between this and 0x09.</td></tr>
</table>


### Note / CC# / MSB
Depending on [type] this sets the note, CC# or MSB.

### Max value / pressure 
0x00 - 0x7F (0-127)

### Min value/pressure
0x00 - 0x7F (0-127)

### Midi port + channel:
This byte sets both the midi port and the midi channel at once: [port 0x0-0xF][channel 0x0-0xF]

#### First nibble: Midi port
<table>
  <tr><th>Value</th><th>Midi port</th></tr>
  <tr><td>0x6?</td><td>All</td></tr>
  <tr><td>0x4?</td><td>Usb</td></tr>
  <tr><td>0x2?</td><td>Midi</td></tr>
  <tr><td>0x1?</td><td>From template</td></tr>
</table>

#### Second nibble: Midi channel
<table>
  <tr><th>Value</th><th>Midi channel</th></tr>
  <tr><td>0x?0</td><td>1</td></tr>
  <tr><td>0x01</td><td>2</td></tr>
  <tr><td colspan="2">&hellip;</td></tr>
  <tr><td>0x10</td><td>From template</td></tr>
</table>

Setting the midi port to template forces the midi channel to template too, ignoring the value we set.

### LSB
Only used if [Type] == rpn or nrpn

### Unknown
I did not find any accessible setting that corresponds to this value. Even setting values via the template does not have any effect.
Default is 0x01


# Table of template data
<table>
  <tr><th>Offset</th><th>Data</th></tr>
  <tr><td>00</td><td>F0 00 20 29 43 00 00: Sysex header + '00 00' meaning a template dump follows</td></tr>
  <tr><td>6</td><td>Template name: 8 bytes of ascii text</td></tr>
  <tr><td>14</td><td>Keyboard [Midi channel]</td></tr>
  <tr><td>15</td><td>Keyboard [Midi port]</td></tr>
  <tr><td>16</td><td>Keyboard [Velocity curve]</td></tr>
  <tr><td>17</td><td>[Aftertouch] on/off</td></tr>
  <tr><td>18</td><td>[Octave] on/off</td></tr>
  <tr><td>19</td><td>[Transpose]</td></tr>
  <tr><td>20</td><td>[Keyboard/midi zones] on/off</td></tr>

  <tr><td>21</td><td>Zone1 Start Note</td></tr>
  <tr><td>22</td><td>Zone1 End Note</td></tr>
  <tr><td>23</td><td>Zone1 [Octave]</td></tr>
  <tr><td>24</td><td>Zone1 [Midi channel]</td></tr>
  <tr><td>25</td><td>Zone1 [Midi port]</td></tr>

  <tr><td>26</td><td>Zone2 Start Note</td></tr>
  <tr><td>27</td><td>Zone2 End Note</td></tr>
  <tr><td>28</td><td>Zone2 [Octave]</td></tr>
  <tr><td>29</td><td>Zone2 [Midi channel]</td></tr>
  <tr><td>30</td><td>Zone2 [Midi port]</td></tr>

  <tr><td>31</td><td>Zone3 Start Note</td></tr>
  <tr><td>32</td><td>Zone3 End Note</td></tr>
  <tr><td>33</td><td>Zone3 [Octave]</td></tr>
  <tr><td>34</td><td>Zone3 [Midi channel]</td></tr>
  <tr><td>35</td><td>Zone3 [Midi port]</td></tr>

  <tr><td>36</td><td>Zone4 Start Note</td></tr>
  <tr><td>37</td><td>Zone4 End Note</td></tr>
  <tr><td>38</td><td>Zone4 [Octave]</td></tr>
  <tr><td>39</td><td>Zone4 [Midi channel]</td></tr>
  <tr><td>40</td><td>Zone4 [Midi port]</td></tr>

  <tr><td>41</td><td>Encoder 1 message [Type]</td></tr>
  <tr><td>42</td><td>Encoder 1 [Note/CC/MSB]</td></tr>
  <tr><td>43</td><td>Encoder 1 [Max value]</td></tr>
  <tr><td>44</td><td>Encoder 1 [Min value]</td></tr>
  <tr><td>45</td><td>Encoder 1 [Midi port + channel]</td></tr>
  <tr><td>46</td><td>Encoder 1 [Lsb]</td></tr>
  <tr><td>47</td><td>Encoder 1 [Unknown]</td></tr>

  <tr><td>48</td><td>Encoder 2 message [Type]</td></tr>
  <tr><td>49</td><td>Encoder 2 [Note/CC/MSB]</td></tr>
  <tr><td>50</td><td>Encoder 2 [Max value]</td></tr>
  <tr><td>51</td><td>Encoder 2 [Min value]</td></tr>
  <tr><td>52</td><td>Encoder 2 [Midi port + channel]</td></tr>
  <tr><td>53</td><td>Encoder 2 [Lsb]</td></tr>
  <tr><td>54</td><td>Encoder 2 [Unknown]</td></tr>

  <tr><td>55</td><td>Encoder 3 message [Type]</td></tr>
  <tr><td>56</td><td>Encoder 3 [Note/CC/MSB]</td></tr>
  <tr><td>57</td><td>Encoder 3 [Max value]</td></tr>
  <tr><td>58</td><td>Encoder 3 [Min value]</td></tr>
  <tr><td>59</td><td>Encoder 3 [Midi port + channel]</td></tr>
  <tr><td>60</td><td>Encoder 3 [Lsb]</td></tr>
  <tr><td>61</td><td>Encoder 3 [Unknown]</td></tr>

  <tr><td>62</td><td>Encoder 4 message [Type]</td></tr>
  <tr><td>63</td><td>Encoder 4 [Note/CC/MSB]</td></tr>
  <tr><td>64</td><td>Encoder 4 [Max value]</td></tr>
  <tr><td>65</td><td>Encoder 4 [Min value]</td></tr>
  <tr><td>66</td><td>Encoder 4 [Midi port + channel]</td></tr>
  <tr><td>67</td><td>Encoder 4 [Lsb]</td></tr>
  <tr><td>68</td><td>Encoder 4 [Unknown]</td></tr>

  <tr><td>68</td><td>Encoder 5 message [Type]</td></tr>
  <tr><td>70</td><td>Encoder 5 [Note/CC/MSB]</td></tr>
  <tr><td>71</td><td>Encoder 5 [Max value]</td></tr>
  <tr><td>72</td><td>Encoder 5 [Min value]</td></tr>
  <tr><td>73</td><td>Encoder 5 [Midi port + channel]</td></tr>
  <tr><td>74</td><td>Encoder 5 [Lsb]</td></tr>
  <tr><td>75</td><td>Encoder 5 [Unknown]</td></tr>

  <tr><td>76</td><td>Encoder 6 message [Type]</td></tr>
  <tr><td>77</td><td>Encoder 6 [Note/CC/MSB]</td></tr>
  <tr><td>78</td><td>Encoder 6 [Max value]</td></tr>
  <tr><td>79</td><td>Encoder 6 [Min value]</td></tr>
  <tr><td>80</td><td>Encoder 6 [Midi port + channel]</td></tr>
  <tr><td>81</td><td>Encoder 6 [Lsb]</td></tr>
  <tr><td>82</td><td>Encoder 6 [Unknown]</td></tr>

  <tr><td>83</td><td>Encoder 7 message [Type]</td></tr>
  <tr><td>84</td><td>Encoder 7 [Note/CC/MSB]</td></tr>
  <tr><td>85</td><td>Encoder 7 [Max value]</td></tr>
  <tr><td>86</td><td>Encoder 7 [Min value]</td></tr>
  <tr><td>87</td><td>Encoder 7 [Midi port + channel]</td></tr>
  <tr><td>88</td><td>Encoder 7 [Lsb]</td></tr>
  <tr><td>89</td><td>Encoder 7 [Unknown]</td></tr>

  <tr><td>90</td><td>Encoder 8 message [Type]</td></tr>
  <tr><td>91</td><td>Encoder 8 [Note/CC/MSB]</td></tr>
  <tr><td>92</td><td>Encoder 8 [Max value]</td></tr>
  <tr><td>93</td><td>Encoder 8 [Min value]</td></tr>
  <tr><td>94</td><td>Encoder 8 [Midi port + channel]</td></tr>
  <tr><td>95</td><td>Encoder 8 [Lsb]</td></tr>
  <tr><td>96</td><td>Encoder 8 [Unknown]</td></tr>

  <tr><td>97</td><td>Drum pad 1 message [Type]</td></tr>
  <tr><td>98</td><td>Drum pad 1 [Note/CC/MSB]</td></tr>
  <tr><td>99</td><td>Drum pad 1 [Max value]</td></tr>
  <tr><td>100</td><td>Drum pad 1 [Min value]</td></tr>
  <tr><td>101</td><td>Drum pad 1 [Midi port + channel]</td></tr>
  <tr><td>102</td><td>Drum pad 1 [Lsb]</td></tr>
  <tr><td>103</td><td>Drum pad 1 [Unknown]</td></tr>

  <tr><td>104</td><td>Drum pad 2 message [Type]</td></tr>
  <tr><td>105</td><td>Drum pad 2 [Note/CC/MSB]</td></tr>
  <tr><td>106</td><td>Drum pad 2 [Max value]</td></tr>
  <tr><td>107</td><td>Drum pad 2 [Min value]</td></tr>
  <tr><td>108</td><td>Drum pad 2 [Midi port + channel]</td></tr>
  <tr><td>109</td><td>Drum pad 2 [Lsb]</td></tr>
  <tr><td>110</td><td>Drum pad 2 [Unknown]</td></tr>

  <tr><td>111</td><td>Drum pad 3 message [Type]</td></tr>
  <tr><td>112</td><td>Drum pad 3 [Note/CC/MSB]</td></tr>
  <tr><td>113</td><td>Drum pad 3 [Max value]</td></tr>
  <tr><td>114</td><td>Drum pad 3 [Min value]</td></tr>
  <tr><td>115</td><td>Drum pad 3 [Midi port + channel]</td></tr>
  <tr><td>116</td><td>Drum pad 3 [Lsb]</td></tr>
  <tr><td>117</td><td>Drum pad 3 [Unknown]</td></tr>

  <tr><td>118</td><td>Drum pad 4 message [Type]</td></tr>
  <tr><td>119</td><td>Drum pad 4 [Note/CC/MSB]</td></tr>
  <tr><td>120</td><td>Drum pad 4 [Max value]</td></tr>
  <tr><td>121</td><td>Drum pad 4 [Min value]</td></tr>
  <tr><td>122</td><td>Drum pad 4 [Midi port + channel]</td></tr>
  <tr><td>123</td><td>Drum pad 4 [Lsb]</td></tr>
  <tr><td>124</td><td>Drum pad 4 [Unknown]</td></tr>

  <tr><td>125</td><td>Drum pad 5 message [Type]</td></tr>
  <tr><td>126</td><td>Drum pad 5 [Note/CC/MSB]</td></tr>
  <tr><td>127</td><td>Drum pad 5 [Max value]</td></tr>
  <tr><td>128</td><td>Drum pad 5 [Min value]</td></tr>
  <tr><td>129</td><td>Drum pad 5 [Midi port + channel]</td></tr>
  <tr><td>130</td><td>Drum pad 5 [Lsb]</td></tr>
  <tr><td>131</td><td>Drum pad 5 [Unknown]</td></tr>

  <tr><td>132</td><td>Drum pad 6 message [Type]</td></tr>
  <tr><td>133</td><td>Drum pad 6 [Note/CC/MSB]</td></tr>
  <tr><td>134</td><td>Drum pad 6 [Max value]</td></tr>
  <tr><td>135</td><td>Drum pad 6 [Min value]</td></tr>
  <tr><td>136</td><td>Drum pad 6 [Midi port + channel]</td></tr>
  <tr><td>137</td><td>Drum pad 6 [Lsb]</td></tr>
  <tr><td>138</td><td>Drum pad 6 [Unknown]</td></tr>

  <tr><td>139</td><td>Drum pad 7 message [Type]</td></tr>
  <tr><td>140</td><td>Drum pad 7 [Note/CC/MSB]</td></tr>
  <tr><td>141</td><td>Drum pad 7 [Max value]</td></tr>
  <tr><td>142</td><td>Drum pad 7 [Min value]</td></tr>
  <tr><td>143</td><td>Drum pad 7 [Midi port + channel]</td></tr>
  <tr><td>144</td><td>Drum pad 7 [Lsb]</td></tr>
  <tr><td>145</td><td>Drum pad 7 [Unknown]</td></tr>

  <tr><td>146</td><td>Drum pad 8 message [Type]</td></tr>
  <tr><td>147</td><td>Drum pad 8 [Note/CC/MSB]</td></tr>
  <tr><td>148</td><td>Drum pad 8 [Max value]</td></tr>
  <tr><td>149</td><td>Drum pad 8 [Min value]</td></tr>
  <tr><td>150</td><td>Drum pad 8 [Midi port + channel]</td></tr>
  <tr><td>151</td><td>Drum pad 8 [Lsb]</td></tr>
  <tr><td>152</td><td>Drum pad 8 [Unknown]</td></tr>

  <tr><td>153</td><td>Fader 1 message [Type] (Impulse 49/61)</td></tr>
  <tr><td>154</td><td>Fader 1 [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>155</td><td>Fader 1 [Max value] (Impulse 49/61)</td></tr>
  <tr><td>156</td><td>Fader 1 [Min value] (Impulse 49/61)</td></tr>
  <tr><td>157</td><td>Fader 1 [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>158</td><td>Fader 1 [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>159</td><td>Fader 1 [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>160</td><td>Fader 2 message [Type] (Impulse 49/61)</td></tr>
  <tr><td>161</td><td>Fader 2 [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>162</td><td>Fader 2 [Max value] (Impulse 49/61)</td></tr>
  <tr><td>163</td><td>Fader 2 [Min value] (Impulse 49/61)</td></tr>
  <tr><td>164</td><td>Fader 2 [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>165</td><td>Fader 2 [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>166</td><td>Fader 2 [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>167</td><td>Fader 3 message [Type] (Impulse 49/61)</td></tr>
  <tr><td>168</td><td>Fader 3 [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>169</td><td>Fader 3 [Max value] (Impulse 49/61)</td></tr>
  <tr><td>170</td><td>Fader 3 [Min value] (Impulse 49/61)</td></tr>
  <tr><td>171</td><td>Fader 3 [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>172</td><td>Fader 3 [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>173</td><td>Fader 3 [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>174</td><td>Fader 4 message [Type] (Impulse 49/61)</td></tr>
  <tr><td>175</td><td>Fader 4 [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>176</td><td>Fader 4 [Max value] (Impulse 49/61)</td></tr>
  <tr><td>177</td><td>Fader 4 [Min value] (Impulse 49/61)</td></tr>
  <tr><td>178</td><td>Fader 4 [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>179</td><td>Fader 4 [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>180</td><td>Fader 4 [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>181</td><td>Fader 5 message [Type] (Impulse 49/61)</td></tr>
  <tr><td>182</td><td>Fader 5 [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>183</td><td>Fader 5 [Max value] (Impulse 49/61)</td></tr>
  <tr><td>184</td><td>Fader 5 [Min value] (Impulse 49/61)</td></tr>
  <tr><td>185</td><td>Fader 5 [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>186</td><td>Fader 5 [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>187</td><td>Fader 5 [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>188</td><td>Fader 6 message [Type] (Impulse 49/61)</td></tr>
  <tr><td>189</td><td>Fader 6 [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>190</td><td>Fader 6 [Max value] (Impulse 49/61)</td></tr>
  <tr><td>191</td><td>Fader 6 [Min value] (Impulse 49/61)</td></tr>
  <tr><td>192</td><td>Fader 6 [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>193</td><td>Fader 6 [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>194</td><td>Fader 6 [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>195</td><td>Fader 7 message [Type] (Impulse 49/61)</td></tr>
  <tr><td>196</td><td>Fader 7 [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>197</td><td>Fader 7 [Max value] (Impulse 49/61)</td></tr>
  <tr><td>198</td><td>Fader 7 [Min value] (Impulse 49/61)</td></tr>
  <tr><td>199</td><td>Fader 7 [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>200</td><td>Fader 7 [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>201</td><td>Fader 7 [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>202</td><td>Fader 8 message [Type] (Impulse 49/61)</td></tr>
  <tr><td>203</td><td>Fader 8 [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>204</td><td>Fader 8 [Max value] (Impulse 49/61)</td></tr>
  <tr><td>205</td><td>Fader 8 [Min value] (Impulse 49/61)</td></tr>
  <tr><td>206</td><td>Fader 8 [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>207</td><td>Fader 8 [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>208</td><td>Fader 8 [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>209</td><td>Master fader message [Type] (Impulse 49/61)</td></tr>
  <tr><td>210</td><td>Master fader [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>211</td><td>Master fader [Max value] (Impulse 49/61)</td></tr>
  <tr><td>212</td><td>Master fader [Min value] (Impulse 49/61)</td></tr>
  <tr><td>213</td><td>Master fader [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>214</td><td>Master fader [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>215</td><td>Master fader [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>216</td><td>Fader 1 button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>217</td><td>Fader 1 button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>218</td><td>Fader 1 button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>219</td><td>Fader 1 button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>220</td><td>Fader 1 button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>221</td><td>Fader 1 button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>222</td><td>Fader 1 button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>223</td><td>Fader 2 button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>224</td><td>Fader 2 button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>225</td><td>Fader 2 button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>226</td><td>Fader 2 button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>227</td><td>Fader 2 button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>228</td><td>Fader 2 button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>229</td><td>Fader 2 button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>230</td><td>Fader 3 button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>231</td><td>Fader 3 button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>232</td><td>Fader 3 button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>233</td><td>Fader 3 button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>234</td><td>Fader 3 button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>235</td><td>Fader 3 button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>236</td><td>Fader 3 button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>237</td><td>Fader 4 button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>238</td><td>Fader 4 button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>239</td><td>Fader 4 button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>240</td><td>Fader 4 button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>241</td><td>Fader 4 button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>242</td><td>Fader 4 button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>243</td><td>Fader 4 button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>244</td><td>Fader 5 button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>245</td><td>Fader 5 button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>246</td><td>Fader 5 button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>247</td><td>Fader 5 button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>248</td><td>Fader 5 button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>249</td><td>Fader 5 button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>250</td><td>Fader 5 button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>251</td><td>Fader 6 button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>252</td><td>Fader 6 button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>253</td><td>Fader 6 button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>254</td><td>Fader 6 button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>255</td><td>Fader 6 button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>256</td><td>Fader 6 button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>257</td><td>Fader 6 button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>258</td><td>Fader 7 button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>259</td><td>Fader 7 button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>260</td><td>Fader 7 button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>261</td><td>Fader 7 button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>262</td><td>Fader 7 button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>263</td><td>Fader 7 button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>264</td><td>Fader 7 button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>265</td><td>Fader 8 button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>266</td><td>Fader 8 button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>267</td><td>Fader 8 button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>268</td><td>Fader 8 button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>269</td><td>Fader 8 button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>270</td><td>Fader 8 button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>271</td><td>Fader 8 button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>272</td><td>Master fader button message [Type] (Impulse 49/61)</td></tr>
  <tr><td>273</td><td>Master fader button [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>274</td><td>Master fader button [Max value] (Impulse 49/61)</td></tr>
  <tr><td>275</td><td>Master fader button [Min value] (Impulse 49/61)</td></tr>
  <tr><td>276</td><td>Master fader button [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>277</td><td>Master fader button [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>278</td><td>Master fader button [Unknown] (Impulse 49/61)</td></tr>

  <tr><td>279</td><td>Bank up/down? message [Type] (Impulse 49/61)</td></tr>
  <tr><td>280</td><td>Bank up/down? [Note/CC/MSB] (Impulse 49/61)</td></tr>
  <tr><td>281</td><td>Bank up/down? [Max value] (Impulse 49/61)</td></tr>
  <tr><td>282</td><td>Bank up/down? [Min value] (Impulse 49/61)</td></tr>
  <tr><td>283</td><td>Bank up/down? [Midi port + channel] (Impulse 49/61)</td></tr>
  <tr><td>284</td><td>Bank up/down? [Lsb] (Impulse 49/61)</td></tr>
  <tr><td>285</td><td>Bank up/down? [Unknown] (Impulse 49/61)</td></tr>
</table>